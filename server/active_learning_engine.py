# =========================================================================
#  Version: 3.2
#  File: server/active_learning_engine.py (Server)
#  Cập nhật gần nhất: 3.1
# =========================================================================
import logging
import random
import asyncio
from data_utils import load_data
from embedding_model import EmbeddingModel
from selection_strategies import select_next_batch
from trainer import train_and_evaluate_model
from config import DEVICE

class ActiveLearningEngine:
    def __init__(self, config):
        self.config = config
        self.current_round = 0
        
        logging.info("Initializing Active Learning Engine (RUN mode)...")
        
        # 1. Tải dữ liệu
        full_dataset = load_data(self.config.DATA_PATH)
        self.val_dataset = load_data(self.config.VAL_DATA_PATH)
        
        # 2. Tải mô hình embedding và tính toán trước
        self.embedding_model = EmbeddingModel(self.config.ENCODER_NAME, self.config.ENCODER_MAX_LENGTH, DEVICE)
        all_texts = [item['raw_text'] for item in full_dataset]
        self.all_embeddings = self.embedding_model.get_embeddings(all_texts)
        
        # 3. Khởi tạo các tập dữ liệu
        self.unlabeled_pool = list(range(len(full_dataset)))
        self.labeled_pool = []
        
        # 4. Gắn embedding vào dữ liệu để dễ truy cập
        for i, item in enumerate(full_dataset):
            item['embedding'] = self.all_embeddings[i]
        self.full_dataset = full_dataset

        logging.info("Engine initialized successfully.")

    def get_initial_batch(self):
        """Lấy batch đầu tiên."""
        self.current_round = 1
        logging.info(f"RUN Mode - Round {self.current_round}: Selecting initial batch.")
        
        initial_indices = random.sample(self.unlabeled_pool, self.config.INITIAL_POOL_SIZE)
        
        self.labeled_pool.extend(initial_indices)
        self.unlabeled_pool = [i for i in self.unlabeled_pool if i not in initial_indices]
        
        batch_indices = random.sample(initial_indices, self.config.QUERY_BATCH_SIZE)
        selected_samples = [self.full_dataset[i] for i in batch_indices]
        
        return {
            "iteration": self.current_round,
            "samples": selected_samples
        }

    async def process_labeled_batch(self, labeled_batch_payload):
        """Xử lý batch đã gán nhãn, huấn luyện, và chọn batch tiếp theo."""
        self.current_round += 1
        iteration_id = labeled_batch_payload.get('iteration')
        logging.info(f"RUN Mode - Round {self.current_round}: Processing labeled batch for Iter {iteration_id}.")

        for sample in labeled_batch_payload['samples']:
            # Cập nhật lại anchor_text nếu cần
            # self.full_dataset[sample['id']]['anchor_text'] = sample['summary']
            pass

        logging.info("Starting model training and evaluation...")
        metrics = await train_and_evaluate_model(
            labeled_data=[self.full_dataset[i] for i in self.labeled_pool],
            val_data=self.val_dataset,
            config=self.config
        )
        logging.info(f"Training and evaluation complete. Metrics: {metrics}")
        
        logging.info(f"Selecting next batch using '{self.config.QUERY_STRATEGY}' strategy.")
        next_batch_indices = select_next_batch(
            strategy=self.config.QUERY_STRATEGY,
            unlabeled_indices=self.unlabeled_pool,
            labeled_indices=self.labeled_pool,
            all_embeddings=self.all_embeddings,
            k=self.config.QUERY_BATCH_SIZE,
            idds_lambda=self.config.IDDS_LAMBDA,
            device=DEVICE
        )
        
        self.labeled_pool.extend(next_batch_indices)
        self.unlabeled_pool = [i for i in self.unlabeled_pool if i not in next_batch_indices]
        
        selected_samples = [self.full_dataset[i] for i in next_batch_indices]

        return {
            "evaluation_result": {
                "round": self.current_round,
                "metrics": metrics
            },
            "next_batch": {
                "iteration": self.current_round + 1,
                "samples": selected_samples
            }
        }