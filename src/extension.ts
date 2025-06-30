// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

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
            'labelAssistant', // Định danh của webview
            'Labeling Assistant', // Tiêu đề hiển thị trên tab
            vscode.ViewColumn.One, // Hiển thị ở cột editor chính
            {
                enableScripts: true // Cho phép chạy JavaScript trong webview
            }
        );

        // Đặt nội dung HTML cho webview
        panel.webview.html = getWebviewContent();
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent() {
    // Đây là nơi chúng ta sẽ viết toàn bộ giao diện và logic client
    // Hãy nhớ thay 'YOUR_SERVER_IP' bằng địa chỉ IP public của server remote
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Labeling Assistant</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            #data-container {
                border: 1px solid #ccc;
                padding: 15px;
                margin-top: 15px;
                min-height: 100px;
                background-color: #f5f5f5;
                white-space: pre-wrap; /* Giữ nguyên định dạng xuống dòng */
            }
            .controls { margin-top: 15px; }
            input, button { font-size: 1em; padding: 8px; }
        </style>
    </head>
    <body>
        <h1>Labeling Assistant</h1>
        <p>Connect to the remote server to get and label data.</p>

        <div id="status">Status: Disconnected</div>
        
        <div id="data-container">
            Waiting for data...
        </div>

        <div class="controls">
            <button id="getDataBtn">Get Next Data</button>
        </div>

        <div class="controls">
            <input type="text" id="labelInput" placeholder="Enter label here..." />
            <button id="submitBtn">Submit Label</button>
        </div>

        <script>
            const statusDiv = document.getElementById('status');
            const dataContainer = document.getElementById('data-container');
            const getDataBtn = document.getElementById('getDataBtn');
            const submitBtn = document.getElementById('submitBtn');
            const labelInput = document.getElementById('labelInput');

            // Thay 'YOUR_SERVER_IP' bằng IP của server remote
            const ws = new WebSocket('ws://localhost:8765');
            let currentText = "";

            ws.onopen = () => {
                statusDiv.textContent = 'Status: Connected to server!';
                statusDiv.style.color = 'green';
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                console.log('Received from server:', message);

                if (message.type === 'data') {
                    currentText = message.payload;
                    dataContainer.textContent = currentText;
                } else if (message.type === 'status') {
                    statusDiv.textContent = 'Status: ' + message.payload;
                }
            };

            ws.onclose = () => {
                statusDiv.textContent = 'Status: Disconnected from server.';
                statusDiv.style.color = 'red';
            };

            ws.onerror = (error) => {
                statusDiv.textContent = 'Status: Connection Error!';
                statusDiv.style.color = 'red';
                console.error('WebSocket Error:', error);
            };

            // Gửi lệnh yêu cầu dữ liệu
            getDataBtn.addEventListener('click', () => {
                const command = { action: 'get_data' };
                ws.send(JSON.stringify(command));
            });

            // Gửi dữ liệu đã gán nhãn
            submitBtn.addEventListener('click', () => {
                const label = labelInput.value;
                if (!currentText) {
                    alert('Please get data first!');
                    return;
                }
                if (!label) {
                    alert('Please enter a label!');
                    return;
                }

                const command = {
                    action: 'submit_label',
                    data: {
                        text: currentText,
                        label: label
                    }
                };
                ws.send(JSON.stringify(command));
                labelInput.value = ''; // Xóa ô nhập liệu
            });

        </script>
    </body>
    </html>
  `;
}

// This method is called when your extension is deactivated
export function deactivate() {}
