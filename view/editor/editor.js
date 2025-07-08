/*
=========================================================================
 Version: 1.4
 File: view/editor/editor.js (Cập nhật - Extension)
 Mục đích: Logic cho giao diện Custom Editor, đọc dữ liệu từ
          `window.initialData`.
=========================================================================
*/
(function () {
    const vscode = acquireVsCodeApi();
    const rawTextElem = document.getElementById('raw-text');
    const summaryInput = document.getElementById('summary-input');
    const submitBtn = document.getElementById('submit-btn');

    // Hiển thị dữ liệu ban đầu được truyền từ extension
    const initialData = window.initialData;
    if (initialData) {
        rawTextElem.textContent = initialData.raw_text;
        summaryInput.value = initialData.anchor_text || '';
    }

    // Gửi lại dữ liệu khi nhấn nút "Save Label"
    submitBtn.addEventListener('click', () => {
        vscode.postMessage({
            command: 'submit',
            text: summaryInput.value
        });
    });
}());