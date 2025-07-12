/*
=========================================================================
 Version: 1.5
 File: src/extension.ts (Cập nhật lớn - Extension)
 Mục đích: Sửa lỗi lệnh "showChart" và thêm logic vô hiệu hóa nút submit.
 Thay đổi:
 - Sửa lại hoàn toàn logic tạo Webview Panel cho biểu đồ.
 - Trong lệnh `submitBatch`, tạo một file `.submitted` để đánh dấu
   vòng lặp đã được gửi đi.
=========================================================================
*/
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket = require('ws');
import { MainActionsProvider } from './mainActionsProvider';
import { DataTreeProvider } from './dataTreeProvider';
import { CustomLabelEditorProvider } from './customLabelEditorProvider';

let ws: WebSocket | null = null;
let chartPanel: vscode.WebviewPanel | undefined = undefined;
let chartDataHistory: any[] = [];

function getWorkspacePath(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return folders[0].uri.fsPath;
    }
    vscode.window.showErrorMessage("No workspace folder is open. Please open a folder to use this extension.");
    return undefined;
}

export function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = getWorkspacePath();
    const dataProvider = new DataTreeProvider(workspaceRoot);

    vscode.window.registerTreeDataProvider('mainActionsView', new MainActionsProvider());
    vscode.window.registerTreeDataProvider('dataTreeView', dataProvider);
    context.subscriptions.push(CustomLabelEditorProvider.register(context, dataProvider));

    // Lệnh "Start"
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.start', () => {
            if (ws && ws.readyState === WebSocket.OPEN) { return; }
            ws = new WebSocket('ws://localhost:8765');
            ws.on('open', () => {
                vscode.window.showInformationMessage('✅ Connected! Requesting first batch...');
                chartDataHistory = [];
                ws?.send(JSON.stringify({ action: 'start_process' }));
            });
            ws.on('message', (message: string) => {
                const command = JSON.parse(message);
                console.log("Received from server:", command);
                if (command.type === 'data_batch') {
                    handleDataBatch(command.payload, dataProvider);
                } else if (command.type === 'evaluation_result') {
                    if (chartPanel) {
                        // Nếu tab biểu đồ đang mở, gửi dữ liệu đến nó
                        chartPanel.webview.postMessage(command);
                    } else {
                        // Nếu chưa mở, thông báo cho người dùng
                        vscode.window.showInformationMessage('Received evaluation result. Open the chart view to see it.');
                    }
                    chartDataHistory.push(command);
                }
            });
        })
    );
    
    // Lệnh "Submit Batch"
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.submitBatch', (iterationItem: vscode.TreeItem) => {
            const iterDir = iterationItem.resourceUri?.fsPath;
            if (!iterDir) { return; }

            const files = fs.readdirSync(iterDir).filter(f => f.endsWith('.lbl'));
            const labeledBatch = [];
            
            for (const file of files) {
                const filePath = path.join(iterDir, file);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (!content.anchor_text || content.anchor_text.trim() === "") {
                    vscode.window.showErrorMessage(`File "${file}" has not been labeled yet.`);
                    return;
                }
                labeledBatch.push({ id: content.id, summary: content.anchor_text });
            }

            const messageToServer = {
                action: 'submit_labeled_batch',
                payload: {
                    iteration: parseInt(iterationItem.label!.toString().replace('Iter ', '')),
                    samples: labeledBatch
                }
            };
            ws?.send(JSON.stringify(messageToServer));
            
            // Đánh dấu đã submit bằng cách tạo file .submitted
            fs.writeFileSync(path.join(iterDir, '.submitted'), '');
            dataProvider.refresh(); // Refresh để ẩn nút tick
            
            vscode.window.showInformationMessage(`Batch for ${iterationItem.label} submitted successfully!`);
        })
    );

    // Lệnh "Show Chart"
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.showChart', () => {
            const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
            if (chartPanel) {
                chartPanel.reveal(column);
                return;
            }
            chartPanel = vscode.window.createWebviewPanel(
                'performanceChart',
                'Model Performance',
                column || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'view', 'chart')],
                    retainContextWhenHidden: true
                }
            );
            chartPanel.webview.html = getChartWebviewContent(chartPanel.webview, context.extensionUri);
            
            chartPanel.webview.onDidReceiveMessage(message => {
                if (message.command === 'chart-ready') {
                    chartPanel!.webview.postMessage({ type: 'load_history', payload: chartDataHistory });
                }
            });

            chartPanel.onDidDispose(() => { chartPanel = undefined; }, null, context.subscriptions);
        })
    );
}

function handleDataBatch(payload: any, dataProvider: DataTreeProvider) {
    const { iteration, samples } = payload;
    const workspaceRoot = getWorkspacePath();
    if (!workspaceRoot) return;
    const iterDir = path.join(workspaceRoot, '.labeling', `iter_${iteration}`);
    if (!fs.existsSync(iterDir)) {
        fs.mkdirSync(iterDir, { recursive: true });
    }
    for (const sample of samples) {
        const filePath = path.join(iterDir, `${sample.id}.lbl`);
        fs.writeFileSync(filePath, JSON.stringify({ ...sample, anchor_text: "" }, null, 2));
    }
    dataProvider.refresh();
}

function getChartWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const viewPath = vscode.Uri.joinPath(extensionUri, 'view', 'chart');
    const htmlPath = vscode.Uri.joinPath(viewPath, 'chart.html');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(viewPath, 'chart.js'));
    const nonce = getNonce();
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
    htmlContent = htmlContent
        .replace(/{{nonce}}/g, nonce)
        .replace(/{{cspSource}}/g, webview.cspSource) // Thêm dòng này
        .replace(/{{scriptUri}}/g, scriptUri.toString());
    return htmlContent;
}

function getNonce() { let text = ''; const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); } return text; }