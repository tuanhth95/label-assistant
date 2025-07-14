# =========================================================================
#  Version: 2.13
#  File: server/test_engine.py (Mới - Server)
#  Mục đích: Chứa logic mô phỏng cho chế độ TEST.
# =========================================================================
import logging
import random, json
import asyncio, os
from config import TestConfig
class TestActiveLearningEngine:
    def __init__(self, config):
        self.config = config
        self.config['state'] = "idle" # idle -> data_sent -> training -> evaluating -> evaluated -> idle
        self.config['budget'] = TestConfig['BUDGET']
        self.config['query_batch_size'] = TestConfig['QUERY_BATCH_SIZE']
        self.config['simulated_train_delay'] = TestConfig['SIMULATED_TRAIN_DELAY']
        self.dataset = [
            {"id": i, "raw_text": f"Test document text {i}.", "anchor_text": ""}
            for i in range(1, self.config['budget'] + 1)
        ]
        self.unlabeled_indices = list(range(len(self.dataset)))
        random.shuffle(self.unlabeled_indices)
        self.current_round = 0
        logging.info("Test Active Learning Engine initialized.")

    def get_batch(self):
        """Lấy batch đầu tiên cho chế độ TEST."""
        self.current_round += 1
        logging.info(f"TEST Mode - Round {self.current_round}: Selecting initial simulated batch.")
        
        batch_indices = self.unlabeled_indices[:self.config['query_batch_size']]
        del self.unlabeled_indices[:len(batch_indices)]
        
        selected_samples = [self.dataset[i] for i in batch_indices]
        
        return {
            "iteration": self.current_round,
            "samples": selected_samples
        }
    def set_state(self, state, save=''):
        self.config['state'] = state
        if save != '':
            self.save_config(save)
    
    def load_config(self, path):
        with open(path, 'r') as f:
            self.config = json.load(f)

    def save_config(self, path):
        with open(path, 'w') as f:
            json.dump(self.config, f, indent=4)

    async def process_labeled_batch(self, labeled_batch):
        """Xử lý batch đã gán nhãn, mô phỏng huấn luyện và chọn batch tiếp theo."""
        iteration_id = labeled_batch.get('iteration')
        logging.info(f"TEST Mode: Received batch for Iter {iteration_id}. Simulating train/eval.")
        await asyncio.sleep(self.config['simulated_train_delay'])
        
        # Tạo kết quả đánh giá giả
        eval_result = {
            "round": iteration_id,
            "metrics": {"rouge-1": 0.35 + (iteration_id * 0.05)}
        }
        
        # Lấy batch tiếp theo
        batch = self.get_batch()


        return {
            "evaluation_result": eval_result,
            "next_batch": batch
        }