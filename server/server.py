# =========================================================================
#  Version: 2.5
#  File: server/server.py (Cập nhật lớn - Server)
#  Mục đích: Tái cấu trúc để hỗ trợ 2 chế độ RUN và TEST.
# =========================================================================
import asyncio
import websockets
import json
import logging
import random
import pandas as pd
from datasets import load_dataset, Dataset

# Import các module mới
from config import MODE, WEBSOCKET_HOST, WEBSOCKET_PORT, DATA_PATH, RunConfig, TestConfig
from active_learning_engine import ActiveLearningEngine

logging.basicConfig(level=logging.INFO)

# --- Khởi tạo engine dựa trên chế độ ---
engine = None
if MODE == "RUN":
    # TODO: Load a real dataset here
    # from data_utils import load_data
    data = pd.read_csv(DATA_PATH)
    data.insert(0, 'id', range(0, 0 + len(data)))
    real_dataset = Dataset.from_pandas(data)
    #real_dataset = [{"id": i, "raw_text": f"Real data {i}", "anchor_text": ""} for i in range(100)]
    engine = ActiveLearningEngine(real_dataset, RunConfig)
else: # TEST mode
    logging.info("Server is running in TEST mode.")


async def test_mode_handler(websocket, command):
    """Xử lý logic cho chế độ TEST."""
    action = command.get("action")
    if action == "start_process":
        logging.info("TEST Mode: Sending first simulated batch.")
        batch = {
            "type": "data_batch",
            "payload": {
                "iteration": 1,
                "samples": [{"id": i, "raw_text": f"Test sample {i}", "anchor_text": ""} for i in range(1, TestConfig.BATCH_SIZE + 1)]
            }
        }
        await websocket.send(json.dumps(batch))
    elif action == "submit_labeled_batch":
        iteration = command['payload']['iteration']
        logging.info(f"TEST Mode: Received batch for Iter {iteration}. Simulating train/eval.")
        await asyncio.sleep(TestConfig.SIMULATED_TRAIN_DELAY)
        
        # Gửi kết quả đánh giá giả
        eval_result = {
            "type": "evaluation_result",
            "payload": {"round": iteration, "metrics": {"rouge-1": 0.3 + (iteration * 0.05)}}
        }
        await websocket.send(json.dumps(eval_result))
        
        # Gửi batch tiếp theo
        next_batch = {
            "type": "data_batch",
            "payload": {
                "iteration": iteration + 1,
                "samples": [{"id": i, "raw_text": f"Test sample {i}", "anchor_text": ""} for i in range(1, TestConfig.BATCH_SIZE + 1)]
            }
        }
        await websocket.send(json.dumps(next_batch))

async def run_mode_handler(websocket, command):
    """Xử lý logic cho chế độ RUN."""
    action = command.get("action")
    if action == "start_process":
        initial_batch = engine.get_initial_batch()
        message = {"type": "data_batch", "payload": initial_batch}
        await websocket.send(json.dumps(message))
    elif action == "submit_labeled_batch":
        result = engine.process_labeled_batch(command['payload'])
        
        # Gửi kết quả đánh giá
        eval_message = {"type": "evaluation_result", "payload": result['evaluation_result']}
        await websocket.send(json.dumps(eval_message))
        
        # Gửi batch tiếp theo nếu có
        if result['next_batch']['samples']:
            next_batch_message = {"type": "data_batch", "payload": result['next_batch']}
            await websocket.send(json.dumps(next_batch_message))

async def handler(websocket):
    """Hàm handler chính, điều phối dựa trên MODE."""
    logging.info(f"✅ Client connected.")
    try:
        async for message in websocket:
            command = json.loads(message)
            logging.info(f"⬅️ Received command: {command}")
            
            if MODE == "RUN":
                await run_mode_handler(websocket, command)
            else: # TEST mode
                await test_mode_handler(websocket, command)

    except websockets.exceptions.ConnectionClosed:
        logging.info("❌ Client disconnected.")

async def main():
    async with websockets.serve(handler, WEBSOCKET_HOST, WEBSOCKET_PORT):
        logging.info(f"🚀 WebSocket server started in {MODE} mode on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())