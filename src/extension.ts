import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket = require('ws');
import { MainActionsProvider } from './mainActionsProvider';

// Biến toàn cục để lưu trữ kết nối WebSocket và panel biểu đồ
let ws: WebSocket | null = null;
let chartPanel: vscode.WebviewPanel | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {

    // 1. Đăng ký provider cho sidebar
    const mainActionsProvider = new MainActionsProvider();
    vscode.window.registerTreeDataProvider('mainActionsView', mainActionsProvider);

    // 2. Đăng ký lệnh "Start"
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.start', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                vscode.window.showInformationMessage('Already connected.');
                return;
            }
            
            vscode.window.showInformationMessage('Connecting to server...');
            ws = new WebSocket('ws://localhost:8765');

            ws.on('open', () => {
                vscode.window.showInformationMessage('✅ Connected! Sending start command...');
                // Gửi lệnh bắt đầu tới server
                ws?.send(JSON.stringify({ action: 'start_process' }));
            });

            ws.on('message', (message: string) => {
                const data = JSON.parse(message);
                
                console.log("Received data to label:", data);
                // Log dữ liệu cần gán nhãn ra console
                if (data.type === 'data_to_label') {
                    vscode.window.showInformationMessage(`Received sample to label with ID: ${data.payload.id}`);
                }
                else if (data.type === 'evaluation_result') {
                    if (chartPanel) {
                        // Nếu tab biểu đồ đang mở, gửi dữ liệu đến nó
                        chartPanel.webview.postMessage(data);
                    } else {
                        // Nếu chưa mở, thông báo cho người dùng
                        vscode.window.showInformationMessage('Received evaluation result. Open the chart view to see it.');
                    }
                }
            });

            ws.on('error', (error) => {
                console.error('WebSocket Error:', error);
                vscode.window.showErrorMessage(`WebSocket Error: ${error.message}`);
            });

            ws.on('close', () => {
                vscode.window.showInformationMessage('Disconnected from server.');
                ws = null;
            });
        })
    );

    // 3. Đăng ký lệnh "Show Chart"
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.showChart', () => {
            if (chartPanel) {
                chartPanel.reveal(vscode.ViewColumn.One);
            } else {
                chartPanel = vscode.window.createWebviewPanel(
                    'performanceChart', 
                    'Model Performance', 
                    vscode.ViewColumn.One, 
                    { 
                        enableScripts: true,
                        // Thêm dòng này để cho phép tải file từ thư mục 'view'
                        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'view')]
                    }
                );
                // Cập nhật cách gọi hàm getWebviewContent
                chartPanel.webview.html = getWebviewContent(chartPanel.webview, context.extensionUri, 'chart');
                chartPanel.onDidDispose(() => chartPanel = undefined, null, context.subscriptions);
            }
        })
    );
    // Đăng ký lệnh "Submit Label"
    context.subscriptions.push(
        vscode.commands.registerCommand('labeling.submitLabel', async () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                vscode.window.showErrorMessage('Not connected to the server.');
                return;
            }

            const sampleId = await vscode.window.showInputBox({ prompt: 'Enter the ID of the sample you are labeling' });
            if (!sampleId) return;

            const summary = await vscode.window.showInputBox({ prompt: `Enter the summary for sample ID: ${sampleId}` });
            if (!summary) return;

            const messageToServer = {
                action: 'submit_label',
                payload: { id: sampleId, summary: summary }
            };
            ws.send(JSON.stringify(messageToServer));
            vscode.window.showInformationMessage(`Label for ${sampleId} submitted!`);
        })
    );
}

// Hàm helper để lấy nội dung cho webview
function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, viewType: 'chart'): string {
    const viewPath = vscode.Uri.joinPath(extensionUri, 'view', viewType);
    const htmlPath = vscode.Uri.joinPath(viewPath, `${viewType}.html`);
    
    // Tạo URI hợp lệ cho các file tài nguyên
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(viewPath, `${viewType}.js`));
    
    const nonce = getNonce();
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    // Thay thế các biến giữ chỗ
    htmlContent = htmlContent.replace(/{{nonce}}/g, nonce)
        .replace(/{{cspSource}}/g, webview.cspSource)
        .replace(/{{scriptUri}}/g, scriptUri.toString());
        
    return htmlContent;
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function deactivate() {}