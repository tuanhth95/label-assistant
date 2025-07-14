# =========================================================================
#  Version: 3.1
#  File: server/config.py (Cập nhật - Server)
#  Mục đích: Chuyển từ class sang dict để dễ dàng lưu/tải từ JSON.
# =========================================================================
import torch

MODE = "TEST" 

WEBSOCKET_HOST = "0.0.0.0"
WEBSOCKET_PORT = 12345
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Cấu hình mặc định cho chế độ RUN
RUN_CONFIG_DEFAULT = {
    "DATA_PATH": "./data/dataset.jsonl",
    "VAL_DATA_PATH": "./data/val_dataset.jsonl",
    "BUDGET": 1200,
    "INITIAL_POOL_SIZE": 100,
    "QUERY_BATCH_SIZE": 50,
    "QUERY_STRATEGY": "IDDS",
    "IDDS_LAMBDA": 0.67,
    "MODEL_NAME": "vinai/bartpho-syllable",
    "ENCODER_NAME": "vinai/phobert-base-v2",
    "ENCODER_MAX_LENGTH": 256,
    "NUM_TRAIN_EPOCHS": 10,
    "BATCH_SIZE": 32,
    "LEARNING_RATE": 5e-5
}
    
# Cấu hình mặc định cho chế độ TEST
TEST_CONFIG_DEFAULT = {
    "TOTAL_SAMPLES": 10,
    "BATCH_SIZE": 4,
    "SIMULATED_TRAIN_DELAY": 2
}