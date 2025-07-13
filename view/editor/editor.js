/*
=========================================================================
 Version: 2.3
 File: view/editor/editor.js (Cập nhật - Extension)
 Mục đích: Thêm logic cho các nút Previous/Next.
=========================================================================
*/
(function () {
    const vscode = acquireVsCodeApi();
    const rawTextElem = document.getElementById('raw-text');
    const summaryInput = document.getElementById('summary-input');
    const submitBtn = document.getElementById('submit-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const genSummaryBtn = document.getElementById('gen-summary-btn');
    // const errorContainer = document.getElementById('error-container');

    // Lấy dữ liệu được truyền từ extension
    const initialData = window.initialData;
    const navigation = window.navigation;

    // Hiển thị dữ liệu ban đầu
    if (initialData) {
        rawTextElem.textContent = initialData.raw_text;
        summaryInput.value = initialData.anchor_text || '';
    }

    // Vô hiệu hóa các nút điều hướng nếu không có file tương ứng
    if (!navigation.prev) {
        prevBtn.disabled = true;
    }
    if (!navigation.next) {
        nextBtn.disabled = true;
    }

    // Gửi lại dữ liệu khi nhấn nút "Save Label"
    submitBtn.addEventListener('click', () => {
        vscode.postMessage({
            command: 'submit',
            text: summaryInput.value
        });
    });

    // Xử lý sự kiện cho nút Previous
    prevBtn.addEventListener('click', () => {
        if (navigation.prev) {
            vscode.postMessage({
                command: 'go-to-file',
                filePath: navigation.prev
            });
        }
    });

    // Xử lý sự kiện cho nút Next
    nextBtn.addEventListener('click', () => {
        if (navigation.next) {
            vscode.postMessage({
                command: 'go-to-file',
                filePath: navigation.next
            });
        }
    });
    genSummaryBtn.addEventListener('click', () => {
        const rawText = rawTextElem.textContent;
        if (!rawText || rawText.trim() === "") {
            alert("Raw text is empty.");
            return;
        }
        // Gửi yêu cầu tạo tóm tắt đến extension
        vscode.postMessage({ command: 'gen-summary', text: rawText });
        // Vô hiệu hóa nút trong khi chờ
        genSummaryBtn.disabled = true;
        genSummaryBtn.textContent = 'Generating...';
    });

    // Lắng nghe tin nhắn trả về từ extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'summary-generated':
                summaryInput.value = message.text;
                genSummaryBtn.disabled = false;
                genSummaryBtn.textContent = 'Gen Summary';
                break;
            case 'summary-generation-failed':
                genSummaryBtn.disabled = false;
                genSummaryBtn.textContent = 'Gen Summary';
                break;
        }
    });
}());