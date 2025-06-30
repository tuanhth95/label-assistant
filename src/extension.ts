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

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('label-assistant.start', () => {

		const panel = vscode.window.createWebviewPanel(
            'labelAssistant',
            'Labeling Assistant',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                // Chỉ cho phép webview tải tài nguyên từ thư mục webview-ui
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'view')]
            }
        );

        // Cập nhật nội dung webview
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    // Lấy đường dẫn đến các file trên đĩa
    const webviewUiPath = vscode.Uri.joinPath(extensionUri, 'view');
    const htmlPath = vscode.Uri.joinPath(webviewUiPath, 'index.html');
    const cssUri = vscode.Uri.joinPath(webviewUiPath, 'main.css');
    const scriptUri = vscode.Uri.joinPath(webviewUiPath, 'main.js');
    
    // Chuyển các đường dẫn trên đĩa thành URI mà webview có thể hiểu được
    const styleWebviewUri = webview.asWebviewUri(cssUri);
    const scriptWebviewUri = webview.asWebviewUri(scriptUri);

    // Tạo một nonce để cho phép các script cụ thể được chạy
    const nonce = getNonce();

    // Đọc nội dung file HTML
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    // Thay thế các biến giữ chỗ trong HTML bằng các giá trị đúng
    htmlContent = htmlContent
        .replace('{{cspSource}}', webview.cspSource)
        .replace(/{{nonce}}/g, nonce)
        .replace('{{styleUri}}', styleWebviewUri.toString())
        .replace('{{scriptUri}}', scriptWebviewUri.toString());

    return htmlContent;
}

// Hàm tạo nonce5
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// This method is called when your extension is deactivated
export function deactivate() {}
