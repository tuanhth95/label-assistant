/*
=========================================================================
 Version: 1.4
 File: src/customLabelEditorProvider.ts (Cập nhật - Extension)
 Mục đích: Cung cấp giao diện Webview cho Custom Editor, đọc và ghi
          vào file .lbl vật lý.
=========================================================================
*/
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DataTreeProvider } from './dataTreeProvider';

export class CustomLabelEditorProvider implements vscode.CustomTextEditorProvider {
    public static register(context: vscode.ExtensionContext, dataProvider: DataTreeProvider): vscode.Disposable {
        const provider = new CustomLabelEditorProvider(context, dataProvider);
        return vscode.window.registerCustomEditorProvider(CustomLabelEditorProvider.viewType, provider);
    }

    private static readonly viewType = 'labeling.customEditor';

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly dataProvider: DataTreeProvider
    ) { }

    public resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): void {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'view')]
        };
        webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview, document.getText());

        webviewPanel.webview.onDidReceiveMessage(message => {
            if (message.command === 'submit') {
                try {
                    const currentContent = JSON.parse(document.getText());
                    const updatedContent = { ...currentContent, anchor_text: message.text };
                    fs.writeFileSync(document.uri.fsPath, JSON.stringify(updatedContent, null, 2));
                    this.dataProvider.refresh(); // Yêu cầu TreeView cập nhật icon
                    vscode.window.showInformationMessage(`Saved label for ${path.basename(document.uri.fsPath)}`);
                } catch (e) {
                    vscode.window.showErrorMessage("Failed to save label.");
                }
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview, documentText: string): string {
        const viewPath = vscode.Uri.joinPath(this.context.extensionUri, 'view', 'editor');
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(viewPath, 'editor.js'));
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
                <title>Label Editor</title>
            </head>
            <body>
                <h2>Raw Text</h2>
                <pre id="raw-text"></pre>
                <h2>Your Summary (Anchor Text)</h2>
                <textarea id="summary-input" rows="10" style="width: 95%"></textarea>
                <br/><br/>
                <button id="submit-btn">Save Label</button>
                <script nonce="${nonce}">
                    // Truyền dữ liệu ban đầu vào webview một cách an toàn
                    window.initialData = ${documentText};
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
function getNonce() { let text = ''; const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); } return text; }