# =========================================================================
#  File: server.py (Cập nhật lớn - Server)
#  Mục đích: Triển khai luồng học chủ động có trạng thái, chờ đợi
#           phản hồi từ người dùng và đưa các tham số lên đầu.
# =========================================================================
import asyncio
import websockets
import json
import logging
import random

logging.basicConfig(level=logging.INFO)

# =========================================================================
# CÁC THAM SỐ CẤU HÌNH
# =========================================================================
TOTAL_SAMPLES = 3      # Tổng số mẫu trong bộ dữ liệu mô phỏng
BATCH_SIZE = 2          # Số mẫu gửi đi trong mỗi vòng lặp
# =========================================================================


# --- Dữ liệu và Trạng thái của Server ---
# Mô phỏng dữ liệu được load sẵn
DATASET = [
    {"id": i, "raw_text": f"This is the full text of document {i}.", "anchor_text": f"Anchor {i}"}
    for i in range(1, TOTAL_SAMPLES + 1)
]
unlabeled_indices = list(range(len(DATASET)))
random.shuffle(unlabeled_indices) # Xáo trộn để bốc mẫu ngẫu nhiên

current_batch_ids = []
received_labels_in_batch = {}
current_round = 0

async def send_next_batch(websocket):
    """Chọn và gửi một batch mới cho client."""
    global current_batch_ids, received_labels_in_batch
    
    if not unlabeled_indices:
        await websocket.send(json.dumps({"type": "status_update", "payload": "All data has been labeled! Process complete."}))
        return

    # Reset lại trạng thái cho batch mới
    received_labels_in_batch.clear()
    
    # Bốc mẫu tiếp theo
    batch_to_send_indices = unlabeled_indices[:BATCH_SIZE]
    current_batch_ids = [DATASET[i]['id'] for i in batch_to_send_indices]
    
    logging.info(f"Sending batch with IDs: {current_batch_ids}")
    
    for index in batch_to_send_indices:
        sample = DATASET[index]
        message = {"type": "data_to_label", "payload": sample}
        await websocket.send(json.dumps(message))
        await asyncio.sleep(0.1)
    
    # Cập nhật lại danh sách chưa gán nhãn
    num_sent = len(batch_to_send_indices)
    del unlabeled_indices[:num_sent]
    logging.info(f"Removed {num_sent} samples from unlabeled pool. Remaining: {len(unlabeled_indices)}")

async def train_and_evaluate(websocket):
    """Mô phỏng việc huấn luyện, đánh giá, và gửi kết quả."""
    global current_round
    current_round += 1
    
    logging.info(f"--- Round {current_round}: Training with {len(received_labels_in_batch)} new labels... ---")
    await websocket.send(json.dumps({"type": "status_update", "payload": f"Round {current_round}: Training model..."}))
    await asyncio.sleep(3) # Giả lập thời gian huấn luyện
    
    logging.info(f"--- Round {current_round}: Evaluating model... ---")
    evaluation_result = {
        "type": "evaluation_result",
        "payload": {
            "round": current_round,
            "metrics": {"rouge-1": 0.40 + (current_round * 0.05)}
        }
    }
    await websocket.send(json.dumps(evaluation_result))
    
    # Gửi batch tiếp theo
    await send_next_batch(websocket)

async def handler(websocket):
    """Xử lý kết nối và các lệnh từ client."""
    logging.info(f"✅ Client connected from: {websocket.remote_address}")
    
    try:
        async for message in websocket:
            command = json.loads(message)
            logging.info(f"⬅️ Received command: {command}")
            
            if command.get("action") == "start_process":
                # Khi nhận được lệnh start, bắt đầu gửi batch đầu tiên
                await send_next_batch(websocket)
            
            elif command.get("action") == "submit_label":
                label_data = command.get("payload")
                try:
                    sample_id = int(label_data.get("id"))
                except (ValueError, TypeError):
                    logging.warning(f"Received invalid non-integer ID: {label_data.get('id')}")
                    continue

                logging.info(f"[DEBUG] Current Batch IDs: {current_batch_ids}")
                logging.info(f"[DEBUG] Received Labels Dict Keys: {list(received_labels_in_batch.keys())}")
                if sample_id in received_labels_in_batch:
                    logging.warning(f"[DEBUG] Duplicate label submission for ID: {sample_id}. Overwriting.")

                if sample_id in current_batch_ids:
                    received_labels_in_batch[sample_id] = label_data.get("summary")
                    logging.info(f"Received label for {sample_id}. Total received in batch: {len(received_labels_in_batch)}/{len(current_batch_ids)}")
                    
                    # Nếu đã nhận đủ nhãn cho cả batch, tiến hành huấn luyện
                    if len(received_labels_in_batch) == len(current_batch_ids):
                        await train_and_evaluate(websocket)
                else:
                    logging.warning(f"Received label for ID '{sample_id}' which is not in the current batch.")

    except websockets.exceptions.ConnectionClosed:
        logging.info("❌ Client disconnected.")

async def main():
    logging.info("🚀 Server starting... Data loaded. Waiting for client connection and 'start_process' command.")
    async with websockets.serve(handler, "0.0.0.0", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())