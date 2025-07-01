// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "label-assistant" is now active!');

	context.subscriptions.push(
        vscode.commands.registerCommand('label-assistant.start', () => {
            // Tạo và hiển thị một Webview Panel mới
            const panel = vscode.window.createWebviewPanel(
                'labelAssistantPanel',
                'Labeling Assistant',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    // Giới hạn webview chỉ được truy cập tài nguyên trong thư mục webview-ui
                    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'view')]
                }
            );

            // Gán nội dung HTML cho webview
            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
        })
    );
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const webviewUiPath = vscode.Uri.joinPath(extensionUri, 'view');
    const htmlPath = vscode.Uri.joinPath(webviewUiPath, 'index.html');
    const cssUri = vscode.Uri.joinPath(webviewUiPath, 'main.css');
    const scriptUri = vscode.Uri.joinPath(webviewUiPath, 'main.js');
    
    const styleWebviewUri = webview.asWebviewUri(cssUri);
    const scriptWebviewUri = webview.asWebviewUri(scriptUri);
    const nonce = getNonce();

    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    htmlContent = htmlContent
        .replace('{{cspSource}}', webview.cspSource)
        .replace(/{{nonce}}/g, nonce)
        .replace('{{styleUri}}', styleWebviewUri.toString())
        .replace('{{scriptUri}}', scriptWebviewUri.toString());

    return htmlContent;
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// This method is called when your extension is deactivated
export function deactivate() {}
