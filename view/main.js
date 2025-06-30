// Hàm này chỉ có thể được gọi một lần
const vscode = acquireVsCodeApi();

// Lấy các element
const statusDiv = document.getElementById('status');
const dataContainer = document.getElementById('data-container');
const getDataBtn = document.getElementById('getDataBtn');
const submitBtn = document.getElementById('submitBtn');
const labelInput = document.getElementById('labelInput');

let currentText = "";

// Kết nối WebSocket
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
    statusDiv.textContent = 'Status: Connected!';
    statusDiv.style.color = 'green';
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'data') {
        currentText = message.payload;
        dataContainer.textContent = currentText;
    } else if (message.type === 'status') {
        statusDiv.textContent = 'Status: ' + message.payload;
    }
};

ws.onclose = () => {
    statusDiv.textContent = 'Status: Disconnected.';
    statusDiv.style.color = 'red';
};

getDataBtn.addEventListener('click', () => {
    // Dùng API của VS Code để gửi message nếu cần, hoặc gửi trực tiếp qua WebSocket
    ws.send(JSON.stringify({ action: 'get_data' }));
});

submitBtn.addEventListener('click', () => {
    const label = labelInput.value;
    if (!currentText || !label) {
        alert('Please get data and enter a label first!');
        return;
    }
    // Gửi dữ liệu qua WebSocket
    ws.send(JSON.stringify({
        action: 'submit_label',
        data: { text: currentText, label: label }
    }));
    labelInput.value = '';
});