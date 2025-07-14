import torch

# Chế độ hoạt động: "RUN" hoặc "TEST"
MODE = "TEST" 

# --- Cấu hình chung ---
WEBSOCKET_HOST = "0.0.0.0"
WEBSOCKET_PORT = 12345
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- Cấu hình cho chế độ "RUN" ---
class RunConfig:
    DATA_PATH = "./data/dataset.jsonl"
    VAL_DATA_PATH = "./data/val_dataset.jsonl"
    
    # Active Learning
    BUDGET = 1200
    INITIAL_POOL_SIZE = 100
    QUERY_BATCH_SIZE = 50
    QUERY_STRATEGY = "IDDS" # "IDDS" hoặc "RANDOM"
    IDDS_LAMBDA = 0.67

    # Model & Training
    MODEL_NAME = "vinai/bartpho-syllable"
    ENCODER_NAME = "vinai/phobert-base-v2"
    ENCODER_MAX_LENGTH = 256
    
    NUM_TRAIN_EPOCHS = 10
    BATCH_SIZE = 32
    LEARNING_RATE = 5e-5
    
# --- Cấu hình cho chế độ "TEST" ---
class TestConfig:
    TOTAL_SAMPLES = 20
    BATCH_SIZE = 5
    SIMULATED_TRAIN_DELAY = 2 # Giây