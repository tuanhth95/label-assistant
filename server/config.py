# =========================================================================
#  Version: 2.5
#  File: server/config.py (Mới - Server)
#  Mục đích: Trung tâm hóa toàn bộ cấu hình của server.
# =========================================================================
# Chế độ hoạt động: "RUN" hoặc "TEST"
# RUN: Chạy luồng học chủ động thật sự với việc huấn luyện mô hình.
# TEST: Chạy mô phỏng để kiểm tra giao diện và kết nối.
MODE = "RUN" 

# --- Cấu hình chung ---
WEBSOCKET_HOST = "0.0.0.0"
WEBSOCKET_PORT = 8765

# --- Cấu hình dữ liệu ---
DATA_PATH = "./datasets/abmusu/abmusu_1200.csv" # Đường dẫn đến file dữ liệu


# --- Cấu hình cho chế độ "RUN" ---
class RunConfig:
    MODEL_NAME = "vinai/bartpho-syllable"
    ENCODER_NAME = "vinai/phobert-base-v2"
    NUM_TRAIN_EPOCHS = 3
    LEARNING_RATE = 5e-5
    BATCH_SIZE = 7
    
# --- Cấu hình cho chế độ "TEST" ---
class TestConfig:
    TOTAL_SAMPLES = 10
    SIMULATED_TRAIN_DELAY = 3 # Giây
    BATCH_SIZE = 2
