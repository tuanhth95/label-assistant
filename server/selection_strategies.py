# =========================================================================
#  Version: 3.2
#  File: server/selection_strategies.py (Cập nhật lớn - Server)
#  Mục đích: Tích hợp logic IDDS từ file notebook.
# =========================================================================
import numpy as np
import torch
import random
import logging

def select_next_batch(strategy, **kwargs):
    if strategy.upper() == "IDDS":
        return select_idds_samples(**kwargs)
    elif strategy.upper() == "RANDOM":
        return select_random_samples(**kwargs)
    else:
        raise ValueError(f"Unknown query strategy: {strategy}")

def select_random_samples(unlabeled_indices, k, **kwargs):
    """Chọn ngẫu nhiên k mẫu."""
    batch_size = min(k, len(unlabeled_indices))
    logging.info(f"Randomly selecting {batch_size} samples.")
    return random.sample(unlabeled_indices, batch_size)

def _average_similarity(embedding_tensor, pool_tensor):
    """Hàm helper để tính độ tương đồng cosine trung bình."""
    if pool_tensor.size(0) == 0:
        return 0
    # Mở rộng chiều để broadcasting
    embedding_tensor = embedding_tensor.unsqueeze(0)
    # Tính cosine similarity
    cos_sim = torch.nn.functional.cosine_similarity(embedding_tensor, pool_tensor, dim=1)
    return cos_sim.mean().item()

def select_idds_samples(unlabeled_indices, labeled_indices, all_embeddings, k, idds_lambda, device, **kwargs):
    """
    Triển khai thuật toán IDDS (Informative and Diverse Data Selection)
    dựa trên logic từ file notebook.
    """
    if not unlabeled_indices:
        return []

    logging.info(f"Performing IDDS selection for {k} samples...")
    
    # Lấy các embedding tương ứng với chỉ số
    unlabeled_embeds_np = all_embeddings[unlabeled_indices]
    labeled_embeds_np = all_embeddings[labeled_indices]

    # Chuyển sang tensor trên thiết bị phù hợp
    unlabeled_embeds_tensor = torch.tensor(unlabeled_embeds_np, dtype=torch.float32).to(device)
    labeled_embeds_tensor = torch.tensor(labeled_embeds_np, dtype=torch.float32).to(device)

    # Tính toán điểm informative (độ khác biệt với các mẫu đã gán nhãn)
    # 1 - similarity để điểm càng cao càng tốt
    informative_scores = 1 - torch.tensor(
        [_average_similarity(embed, labeled_embeds_tensor) for embed in unlabeled_embeds_tensor],
        device=device
    )
    
    # Tính toán điểm diversity (độ khác biệt với các mẫu chưa gán nhãn khác)
    # 1 - similarity để điểm càng cao càng tốt
    diversity_scores = 1 - torch.tensor(
        [_average_similarity(embed, unlabeled_embeds_tensor) for embed in unlabeled_embeds_tensor],
        device=device
    )

    # Kết hợp điểm số
    combined_scores = (idds_lambda * informative_scores) + ((1 - idds_lambda) * diversity_scores)
    
    # Chọn ra k mẫu có điểm số cao nhất
    batch_size = min(k, len(unlabeled_indices))
    top_k_indices_in_batch = torch.topk(combined_scores, k=batch_size).indices.cpu().numpy()

    # Ánh xạ các chỉ số của batch về lại chỉ số gốc trong dataset
    selected_original_indices = [unlabeled_indices[i] for i in top_k_indices_in_batch]
    
    logging.info(f"IDDS selection complete. Selected {len(selected_original_indices)} samples.")
    return selected_original_indices