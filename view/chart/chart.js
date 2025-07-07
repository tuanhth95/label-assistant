/*
=========================================================================
 File: view/chart/chart.js (Extension)
 Cập nhật: Thêm DOMContentLoaded để đảm bảo an toàn.
=========================================================================
*/
window.addEventListener('DOMContentLoaded', () => {
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

    // Lắng nghe dữ liệu từ extension
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.type === 'evaluation_result') {
            const { round, metrics } = message.payload;
            chart.data.labels.push(`Round ${round}`);
            chart.data.datasets[0].data.push(metrics['rouge-1']);
            chart.update();
        }
    });
});