# =========================================================================
#  Version: 3.1
#  File: server/data_utils.py (Mới - Server)
#  Mục đích: Chứa các hàm tiện ích để tải và xử lý dữ liệu.
# =========================================================================
import json
import logging
from typing import List, Dict

def load_data(file_path: str) -> List[Dict]:
    try:
        logging.info(f"Attempting to load data from {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            # Hỗ trợ cả file .json (một mảng lớn) và .jsonl (nhiều object trên từng dòng)
            if file_path.endswith('.jsonl'):
                data = [json.loads(line) for line in f]
            else:
                data = json.load(f)
        
        logging.info(f"Successfully loaded {len(data)} samples.")
        return data
    except FileNotFoundError:
        logging.error(f"Error: Data file not found at {file_path}")
        raise
    except json.JSONDecodeError:
        logging.error(f"Error: Could not decode JSON from {file_path}. Please check the file format.")
        raise
    except Exception as e:
        logging.error(f"An unexpected error occurred while loading data: {e}")
        raise