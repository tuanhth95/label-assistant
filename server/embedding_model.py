# =========================================================================
#  Version: 3.1
#  File: server/embedding_model.py (Mới - Server)
#  Mục đích: Đóng gói logic tải mô hình và tạo embedding.
# =========================================================================
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModel
from typing import List
import logging

class EmbeddingModel:
    def __init__(self, model_name: str, max_length: int, device):
        self.device = device
        self.max_length = max_length
        logging.info(f"Loading embedding model: {model_name}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device)
        self.model.eval() # Chuyển sang chế độ đánh giá
        logging.info(f"Embedding model loaded on {self.device}.")

    def get_embeddings(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Tạo embedding cho một danh sách văn bản, xử lý theo từng batch.
        """
        if not texts:
            return np.array([])

        all_embeddings = []
        logging.info(f"Generating embeddings for {len(texts)} texts...")
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            encoded_input = self.tokenizer(
                batch_texts, 
                padding=True, 
                truncation=True, 
                max_length=self.max_length,
                return_tensors='pt'
            ).to(self.device)

            with torch.no_grad():
                model_output = self.model(**encoded_input)
            
            # Lấy embedding của token [CLS]
            batch_embeddings = model_output.last_hidden_state[:, 0, :].cpu().numpy()
            all_embeddings.append(batch_embeddings)

        logging.info("Embedding generation complete.")
        return np.vstack(all_embeddings)