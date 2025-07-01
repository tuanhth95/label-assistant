(function() {
    const vscode = acquireVsCodeApi();

    const statusDiv = document.getElementById('status');
    const dataContainer = document.getElementById('data-container');
    const getDataBtn = document.getElementById('getDataBtn');
    const submitBtn = document.getElementById('submitBtn');
    const labelInput = document.getElementById('labelInput');

    let currentText = "";
    
    // Thay thế 'localhost' bằng địa chỉ server thật nếu không dùng tunnel
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
        statusDiv.textContent = 'Status: Connected!';
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
    };

    getDataBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ action: 'get_data' }));
    });

    submitBtn.addEventListener('click', () => {
        const label = labelInput.value;
        if (!currentText || !label) {
            alert('Please get data and enter a label first!');
            return;
        }
        ws.send(JSON.stringify({
            action: 'submit_label',
            data: { text: currentText, label: label }
        }));
        labelInput.value = '';
    });
}());