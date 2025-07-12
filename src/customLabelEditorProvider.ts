/*
=========================================================================
 Version: 2.3
 File: src/customLabelEditorProvider.ts (Cập nhật - Extension)
 Mục đích: Thêm logic điều hướng Previous/Next.
 Thay đổi:
 - `resolveCustomTextEditor` sẽ tìm các file liền kề và truyền vào webview.
 - `onDidReceiveMessage` sẽ xử lý các lệnh `go-previous` và `go-next`.
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

        // Tìm các file liền kề để điều hướng
        const currentPath = document.uri.fsPath;
        const dirPath = path.dirname(currentPath);
        const filesInDir = fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.lbl'))
            .sort(); // Sắp xếp để đảm bảo thứ tự
        
        const currentIndex = filesInDir.indexOf(path.basename(currentPath));
        const prevFile = currentIndex > 0 ? path.join(dirPath, filesInDir[currentIndex - 1]) : null;
        const nextFile = currentIndex < filesInDir.length - 1 ? path.join(dirPath, filesInDir[currentIndex + 1]) : null;

        webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview, document.getText(), prevFile, nextFile);

        webviewPanel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'submit':
                    const updatedContent = { ...JSON.parse(document.getText()), anchor_text: message.text };
                    fs.writeFileSync(document.uri.fsPath, JSON.stringify(updatedContent, null, 2));
                    this.dataProvider.refresh();
                    vscode.window.showInformationMessage(`Saved label for ${path.basename(document.uri.fsPath)}`);
                    break;
                case 'go-to-file':
                    if (message.filePath) {
                        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.filePath));
                        webviewPanel.dispose(); // Đóng panel hiện tại
                    }
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview, documentText: string, prevFile: string | null, nextFile: string | null): string {
        const viewPath = vscode.Uri.joinPath(this.context.extensionUri, 'view', 'editor');
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(viewPath, 'editor.js'));
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}' https://cdn.tailwindcss.com;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script nonce="${nonce}" src="https://cdn.tailwindcss.com"></script>
                <title>Label Editor</title>
            </head>
            <body class="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 h-screen flex flex-col">
                <main class="flex-grow flex gap-4">
                    <!-- // 2 khung rộng bằng nhau -->
                    <div class="w-1/2 flex flex-col">
                        <h2 class="text-lg font-semibold mb-2">Raw Text</h2>
                        <div id="raw-text-container" class="flex-grow bg-white dark:bg-gray-800 rounded-lg p-3 overflow-y-auto border border-gray-300 dark:border-gray-700">
                            <pre id="raw-text" class="whitespace-pre-wrap font-sans"></pre>
                        </div>
                    </div>
                    <div class="w-1/2 flex flex-col">
                        <h2 class="text-lg font-semibold mb-2">Your Summary</h2>
                        <textarea id="summary-input" class="flex-grow bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Enter your summary here..."></textarea>
                    </div>
                </main>
                <footer class="mt-4 flex justify-start items-center">
                    <button id="prev-btn" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed">&lt; Previous</button>
                    <button id="submit-btn" class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Save Label</button>
                    <button id="next-btn" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Next &gt;</button>
                </footer>

                <script nonce="${nonce}">
                    window.initialData = ${documentText};
                    window.navigation = {
                        prev: ${JSON.stringify(prevFile)},
                        next: ${JSON.stringify(nextFile)}
                    };
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
function getNonce() { let text = ''; const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); } return text; }