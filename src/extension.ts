/*
=========================================================================
 Version: 3.8
 File: src/extension.ts (Cập nhật - Extension)
 Mục đích: Sửa lỗi không tải được script trong Process View.
 Thay đổi:
 - Cập nhật hàm `getProcessWebviewContent` để nhận `webview` làm tham số.
 - Sử dụng `webview.asWebviewUri` để tạo đường dẫn script hợp lệ.
 - Thêm `nonce` và cập nhật CSP cho `process.html` để tăng cường bảo mật.
=========================================================================
*/
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket = require('ws');
import { MainActionsProvider } from './mainActionsProvider';
import { DataTreeProvider } from './dataTreeProvider';
import { CustomLabelEditorProvider } from './customLabelEditorProvider';
import { StateConfig } from './types';
import { saveApiKey } from './openaiService';

let ws: WebSocket | null = null;
let processPanel: vscode.WebviewPanel | undefined = undefined;
let chartPanel: vscode.WebviewPanel | undefined = undefined;
let serverConfig: StateConfig | null = null;
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
    const dataProvider = new DataTreeProvider(getWorkspacePath());
    const mainActionsProvider = new MainActionsProvider();

    vscode.window.registerTreeDataProvider('mainActionsView', mainActionsProvider);
    vscode.window.registerTreeDataProvider('dataTreeView', dataProvider);
    context.subscriptions.push(CustomLabelEditorProvider.register(context, dataProvider));

    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.connect', () => {
            if (ws && ws.readyState === WebSocket.OPEN) { return; }
            ws = new WebSocket('ws://localhost:12345');

            ws.on('open', () => {
                vscode.window.showInformationMessage('✅ Connected to server!');
                mainActionsProvider.refresh(true, false);
            });

            ws.on('message', (message: string) => {
                const command = JSON.parse(message);
                console.log("Received from server:", command);

                if (command.type === 'config_data') {
                    serverConfig = command.payload;
                    mainActionsProvider.refresh(true, true);
                } else if (command.type === 'no_config') {
                    serverConfig = null;
                    mainActionsProvider.refresh(true, false);
                } else if (command.type === 'data_batch') {
                    handleDataBatch(command.payload, dataProvider);
                } else if (command.type === 'evaluation_result') {
                    chartDataHistory.push(command);
                    if (chartPanel) {
                        chartPanel.webview.postMessage(command);
                    }
                }
            });
            ws.on('close', (code, reason) => {
                console.log(`[DEBUG] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
                vscode.window.showWarningMessage('Disconnected from server.');
                mainActionsProvider.refresh(false, false);
                serverConfig = null;
                ws = null;
            });
            ws.on('error', (error) => {
                console.error(`[DEBUG] WebSocket error:`, error);
                vscode.window.showErrorMessage(`WebSocket Error: ${error.message}`);
            });
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.openProcessView', () => {
            if (processPanel) {
                processPanel.reveal();
                return;
            }
            processPanel = vscode.window.createWebviewPanel(
                'processConfig', 'Process Configuration', vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'view')]
                }
            );
            // Sửa lại cách gọi hàm
            processPanel.webview.html = getProcessWebviewContent(processPanel.webview, context.extensionUri, serverConfig);
            
            processPanel.webview.onDidReceiveMessage(message => {
                if (message.action === 'start_with_new_config') {
                    const workspaceRoot = getWorkspacePath();
                    if(workspaceRoot) {
                        const labelingDir = path.join(workspaceRoot, '.labeling');
                        if (fs.existsSync(labelingDir)) {
                            fs.rmSync(labelingDir, { recursive: true, force: true });
                            dataProvider.refresh();
                            vscode.window.showInformationMessage("Cleared old .labeling directory.");
                        }
                    }
                    ws?.send(JSON.stringify(message));
                    processPanel?.dispose();
                } else if (message.action === 'continue_process' || message.action === 'end_process') {
                     ws?.send(JSON.stringify(message));
                     processPanel?.dispose();
                }
            });
            processPanel.onDidDispose(() => { processPanel = undefined; });
        })
    );
    
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
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.showChart', () => {
            const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
            if (chartPanel) {
                chartPanel.reveal(column);
                return;
            }
            chartPanel = vscode.window.createWebviewPanel(
                'performanceChart', 'Model Performance', column || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'view')],
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
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.setApiKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                prompt: "Enter your OpenAI API Key",
                password: true,
                ignoreFocusOut: true
            });
            if (apiKey) {
                saveApiKey(apiKey);
                vscode.window.showInformationMessage("OpenAI API Key saved successfully.");
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.disconnect', () => {
            // Chỉ cần kiểm tra và gọi close.
            // Sự kiện 'close' ở trên sẽ tự động xử lý phần còn lại.
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            } else {
                vscode.window.showInformationMessage('Already disconnected.');
            }
        })
    );

}

// =========================================================================
// HÀM ĐƯỢC SỬA LỖI
// =========================================================================
function getProcessWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, config: StateConfig | null): string {
    const viewPath = vscode.Uri.joinPath(extensionUri, 'view', 'process');
    const htmlPath = vscode.Uri.joinPath(viewPath, 'process.html');
    
    // Sử dụng asWebviewUri để tạo đường dẫn hợp lệ
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(viewPath, 'process.js'));
    const nonce = getNonce();
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
    
    const configString = JSON.stringify(config);
    const escapedConfig = configString.replace(/'/g, '&apos;');

    htmlContent = htmlContent
        .replace(/{{nonce}}/g, nonce)
        .replace(/{{cspSource}}/g, webview.cspSource)
        .replace(/{{scriptUri}}/g, scriptUri.toString())
        .replace('{{configData}}', escapedConfig);

    return htmlContent;
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