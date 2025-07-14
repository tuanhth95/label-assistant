(function () {
    const vscode = acquireVsCodeApi();
    const form = document.getElementById('config-form');
    const title = document.getElementById('view-title');
    const mainBtn = document.getElementById('main-action-btn');
    const endBtn = document.getElementById('end-btn');

    // SỬA LỖI: Đọc dữ liệu từ thuộc tính data-config của body
    const body = document.querySelector('body');
    const config = JSON.parse(body.dataset.config);
    const isContinue = !!config;

    // Cập nhật UI dựa trên trạng thái
    title.textContent = isContinue ? "Continue Process" : "Start New Process";
    mainBtn.textContent = isContinue ? "Continue" : "Start";

    // Điền dữ liệu vào form
    const fields = ['name', 'budget', 'models', 'select_strategies'];
    fields.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            if (Array.isArray(config?.[id])) { // Handle select options
                config[id].forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = opt.textContent = option;
                    input.appendChild(opt);
                });
                input.value = config[`current_${id}`];
            } else {
                input.value = config?.[id] ?? '';
            }
            if (isContinue) {
                input.disabled = true;
            }
        }
    });

    // Xử lý sự kiện submit form
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newConfig = {
            name: document.getElementById('name').value,
            budget: parseInt(document.getElementById('budget').value, 10),
            current_models: document.getElementById('models').value,
            current_select_strategies: document.getElementById('select_strategies').value,
            // ... lấy các giá trị khác
        };
        
        vscode.postMessage({
            action: isContinue ? 'continue_process' : 'start_with_new_config',
            config: isContinue ? config : newConfig // Gửi config cũ nếu continue, mới nếu start
        });
    });

    // Xử lý nút End
    endBtn.style.display = isContinue ? 'inline-block' : 'none';
    endBtn.addEventListener('click', () => {
        vscode.postMessage({ action: 'end_process' });
    });
}());