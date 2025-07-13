# =========================================================================
#  Version: 2.5
#  File: server/active_learning_engine.py (Mới - Server)
#  Mục đích: Chứa toàn bộ logic cho luồng học chủ động thật (chế độ RUN).
# =========================================================================
import logging
import random, time
# from .trainer import train_model # Sẽ import khi có file trainer.py
# from .data_selector import select_next_batch_idds # Sẽ import khi có file data_selector.py

class ActiveLearningEngine:
    def __init__(self, dataset, config):
        self.dataset = dataset
        self.config = config
        self.unlabeled_pool = list(dataset) # Bắt đầu với toàn bộ dataset
        self.labeled_pool = []
        self.current_round = 0
        logging.info("Active Learning Engine (RUN mode) initialized.")
        #logging.info(f"{len(self.unlabeled_pool)}")

    def get_initial_batch(self):
        """Lấy batch đầu tiên một cách ngẫu nhiên."""
        logging.info(f"RUN Mode - Round {self.current_round}: Selecting initial random batch.")
        
        # Lấy ngẫu nhiên các mẫu từ unlabeled_pool
        batch_size = min(self.config.BATCH_SIZE, len(self.unlabeled_pool))
        selected_samples = random.sample(self.unlabeled_pool, batch_size)
        #logging.info(f"{selected_samples}")
        
        # Xóa các mẫu đã chọn khỏi unlabeled_pool
        self.unlabeled_pool = [s for s in self.unlabeled_pool if s not in selected_samples]
        bat = {
            "iteration": self.current_round,
            "samples": selected_samples
        }
        #logging.info(f"{bat}")
        return bat

    def process_labeled_batch(self, labeled_batch):
        """Xử lý batch đã gán nhãn, huấn luyện, và chọn batch tiếp theo."""
        
        logging.info(f"RUN Mode - Round {self.current_round}: Processing labeled batch.")

        # 1. Cập nhật tập dữ liệu đã gán nhãn
        self.labeled_pool.extend(labeled_batch['samples'])
        
        # 2. Huấn luyện mô hình (Placeholder)
        # trained_model = train_model(self.labeled_pool, self.config)
        time.sleep(3)
        logging.info("Placeholder: Model training would happen here.")
        
        # 3. Đánh giá mô hình (Placeholder)
        # metrics = evaluate_model(trained_model)
        metrics = {"rouge-1": 0.50 + (self.current_round * 0.03)} # Dữ liệu giả
        logging.info(f"Placeholder: Evaluation complete. Metrics: {metrics}")
        
        self.current_round += 1
        # 4. Chọn batch tiếp theo bằng IDDS (Placeholder)
        # selected_samples = select_next_batch_idds(self.unlabeled_pool, self.labeled_pool, self.config)
        batch_size = min(self.config.BATCH_SIZE, len(self.unlabeled_pool))
        selected_samples = random.sample(self.unlabeled_pool, batch_size) # Dữ liệu giả
        self.unlabeled_pool = [s for s in self.unlabeled_pool if s not in selected_samples]

        return {
            "evaluation_result": {
                "round": self.current_round,
                "metrics": metrics
            },
            "next_batch": {
                "iteration": self.current_round,
                "samples": selected_samples
            }
        }