# =========================================================================
#  Version: 1.5
#  File: server.py (Server)
#  Mục đích: Thêm gửi kết quả evaluate sau khi huấn luyện.
# =========================================================================
import asyncio
import websockets
import json
import logging
import random

logging.basicConfig(level=logging.INFO)

# --- Cấu hình ---
TOTAL_SAMPLES = 5
BATCH_SIZE = 2

# --- Dữ liệu và Trạng thái ---
DATASET = [
    {"id": i, "raw_text": f"Raw text for document {i}."}
    for i in range(1, TOTAL_SAMPLES + 1)
]
unlabeled_indices = list(range(len(DATASET)))
random.shuffle(unlabeled_indices)
current_round = 0

async def send_next_batch(websocket):
    global current_round
    current_round += 1
    
    if not unlabeled_indices:
        await websocket.send(json.dumps({"type": "status_update", "payload": "All data has been labeled!"}))
        return

    batch_indices = unlabeled_indices[:BATCH_SIZE]
    batch_samples = [DATASET[i] for i in batch_indices]
    
    message = {
        "type": "data_batch",
        "payload": {
            "iteration": current_round,
            "samples": batch_samples
        }
    }
    logging.info(f"Sending batch for Iteration {current_round} with {len(batch_samples)} samples.")
    await websocket.send(json.dumps(message))
    
    # Cập nhật danh sách chưa gán nhãn
    del unlabeled_indices[:len(batch_indices)]

async def handler(websocket):
    logging.info(f"✅ Client connected.")
    try:
        async for message in websocket:
            command = json.loads(message)
            
            if command.get("action") == "start_process":
                await send_next_batch(websocket)
            
            elif command.get("action") == "submit_labeled_batch":
                labeled_data = command.get("payload")
                iteration_id = labeled_data.get('iteration')
                logging.info(f"Received labeled batch for Iteration {iteration_id}. Simulating training...")
                
                # Mô phỏng huấn luyện và đánh giá
                await asyncio.sleep(3) 
                
                # Gửi kết quả đánh giá
                evaluation_result = {
                    "type": "evaluation_result",
                    "payload": {
                        "round": iteration_id,
                        "metrics": {"rouge-1": 0.40 + (iteration_id * 0.05)}
                    }
                }
                await websocket.send(json.dumps(evaluation_result))
                logging.info(f"Sent evaluation results for Iteration {iteration_id}.")

                # Gửi batch tiếp theo
                await send_next_batch(websocket)

    except websockets.exceptions.ConnectionClosed:
        logging.info("❌ Client disconnected.")

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8765):
        logging.info("🚀 Server started. Waiting for client connection.")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())