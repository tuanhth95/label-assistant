/*
=========================================================================
 Version: 1.9
 File: view/chart/chart.js (Extension)
 Cập nhật: Thêm logic xử lý tin nhắn "load_history" để vẽ lại toàn bộ
          biểu đồ từ dữ liệu lịch sử.
=========================================================================
*/
window.addEventListener('DOMContentLoaded', () => {
    const vscode = acquireVsCodeApi();
    const ctx = document.getElementById('performanceChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Vòng lặp
            datasets: [{
                label: 'ROUGE-1 Score',
                data: [], // Điểm số
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Hàm để thêm một điểm dữ liệu vào biểu đồ
    function addDataPoint(result) {
        const { round, metrics } = result.payload;
        chart.data.labels.push(`Round ${round}`);
        chart.data.datasets[0].data.push(metrics['rouge-1']);
        chart.update();
    }

    // Lắng nghe dữ liệu từ extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            // Xử lý khi nhận được một điểm dữ liệu mới
            case 'evaluation_result':
                addDataPoint(message);
                break;
            
            // Xử lý khi nhận được toàn bộ lịch sử
            case 'load_history':
                const history = message.payload;
                // Xóa dữ liệu cũ
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
                // Thêm toàn bộ dữ liệu lịch sử vào biểu đồ
                history.forEach(result => addDataPoint(result));
                break;
        }
    });

    // Báo cho extension biết webview đã sẵn sàng nhận dữ liệu
    vscode.postMessage({ command: 'chart-ready' });
});