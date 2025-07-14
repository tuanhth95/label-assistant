# =========================================================================
#  Version: 3.1
#  File: server/test_engine.py (Mới - Server)
#  Mục đích: Chứa logic mô phỏng cho chế độ TEST.
# =========================================================================
import logging
import random
import asyncio
from config import TEST_CONFIG_DEFAULT

class TestActiveLearningEngine:
    def __init__(self, config):
        self.config = config
        self.config['TOTAL_SAMPLES'] = TEST_CONFIG_DEFAULT['TOTAL_SAMPLES']
        self.config['BATCH_SIZE'] = TEST_CONFIG_DEFAULT['BATCH_SIZE']
        self.config['SIMULATED_TRAIN_DELAY'] = TEST_CONFIG_DEFAULT['SIMULATED_TRAIN_DELAY']
        print(self.config)
        self.dataset = [
            {"id": i, "raw_text": f"Test document text {i}.", "anchor_text": ""}
            for i in range(1, self.config['TOTAL_SAMPLES'] + 1)
        ]
        self.unlabeled_indices = list(range(len(self.dataset)))
        random.shuffle(self.unlabeled_indices)
        self.current_round = 0
        logging.info("Test Active Learning Engine initialized.")

    def get_initial_batch(self):
        """Lấy batch đầu tiên cho chế độ TEST."""
        self.current_round += 1
        logging.info(f"TEST Mode - Round {self.current_round}: Selecting initial simulated batch.")
        
        batch_indices = self.unlabeled_indices[:self.config['BATCH_SIZE']]
        del self.unlabeled_indices[:len(batch_indices)]
        
        selected_samples = [self.dataset[i] for i in batch_indices]
        
        return {
            "iteration": self.current_round,
            "samples": selected_samples
        }

    async def process_labeled_batch(self, labeled_batch_payload):
        """Xử lý batch đã gán nhãn, mô phỏng huấn luyện và chọn batch tiếp theo."""
        iteration_id = labeled_batch_payload.get('iteration')
        logging.info(f"TEST Mode: Received batch for Iter {iteration_id}. Simulating train/eval.")
        await asyncio.sleep(self.config['SIMULATED_TRAIN_DELAY'])
        
        # Tạo kết quả đánh giá giả
        eval_result = {
            "round": iteration_id,
            "metrics": {"rouge-1": 0.35 + (iteration_id * 0.05)}
        }
        
        # Lấy batch tiếp theo
        self.current_round += 1
        next_batch_indices = self.unlabeled_indices[:self.config['BATCH_SIZE']]
        del self.unlabeled_indices[:len(next_batch_indices)]
        next_samples = [self.dataset[i] for i in next_batch_indices]

        return {
            "evaluation_result": eval_result,
            "next_batch": {
                "iteration": self.current_round,
                "samples": next_samples
            }
        }