# =========================================================================
#  Version: 3.5
#  File: server/server.py (Cập nhật lớn - Server)
#  Mục đích: Tái cấu trúc để xử lý luồng config mới.
# =========================================================================
import asyncio
import websockets
import json
import logging
import os

from config import MODE, WEBSOCKET_HOST, WEBSOCKET_PORT, RunConfig, TestConfig
from active_learning_engine import ActiveLearningEngine
from test_engine import TestActiveLearningEngine

logging.basicConfig(level=logging.INFO)

CONFIG_FILE_PATH = "./state_config.json"
engine = None

async def handler(websocket):
    """Hàm handler chính, điều phối dựa trên engine đã được khởi tạo."""
    global engine
    logging.info(f"✅ Client connected.")
    
    # 1. Khi client kết nối, kiểm tra và gửi config nếu có
    if os.path.exists(CONFIG_FILE_PATH):
        with open(CONFIG_FILE_PATH, 'r') as f:
            config_data = json.load(f)
        await websocket.send(json.dumps({"type": "config_data", "payload": config_data}))
    else:
        await websocket.send(json.dumps({"type": "no_config"}))

    try:
        async for message in websocket:
            command = json.loads(message)
            logging.info(f"⬅️ Received command: {command}")
            
            action = command.get("action")
            
            # 2. Xử lý khi người dùng bắt đầu hoặc tiếp tục
            if action == "start_with_new_config" or action == "continue_process":
                config_payload = command.get("config")
                
                # Lưu config mới
                with open(CONFIG_FILE_PATH, 'w') as f:
                    json.dump(config_payload, f, indent=4)
                logging.info(f"Saved new config to {CONFIG_FILE_PATH}")
                
                # Khởi tạo engine dựa trên chế độ và config
                if MODE == "RUN":
                    engine = ActiveLearningEngine(config_payload)
                else: # TEST mode
                    engine = TestActiveLearningEngine(config_payload)
                
                # Bắt đầu vòng lặp bằng cách gửi batch đầu tiên
                initial_batch = engine.get_initial_batch()
                response = {"type": "data_batch", "payload": initial_batch}
                await websocket.send(json.dumps(response))

            # 3. Xử lý khi nhận batch đã gán nhãn
            elif action == "submit_labeled_batch":
                if not engine:
                    logging.warning("Received submit_labeled_batch but engine is not initialized.")
                    continue
                
                result = await engine.process_labeled_batch(command['payload'])
                
                # Gửi kết quả đánh giá
                eval_message = {"type": "evaluation_result", "payload": result['evaluation_result']}
                await websocket.send(json.dumps(eval_message))
                
                # Gửi batch tiếp theo
                if result['next_batch']['samples']:
                    next_batch_message = {"type": "data_batch", "payload": result['next_batch']}
                    await websocket.send(json.dumps(next_batch_message))
                else:
                    await websocket.send(json.dumps({"type": "status_update", "payload": "Process complete!"}))
            
            elif action == "end_process":
                logging.info("Client requested to end the process. Resetting state.")
                engine = None
                if os.path.exists(CONFIG_FILE_PATH):
                    os.remove(CONFIG_FILE_PATH)
                await websocket.send(json.dumps({"type": "no_config"}))


    except websockets.exceptions.ConnectionClosed:
        logging.info("❌ Client disconnected.")

async def main():
    async with websockets.serve(handler, WEBSOCKET_HOST, WEBSOCKET_PORT):
        logging.info(f"🚀 WebSocket server started in {MODE} mode on ws://{WEBSOCKET_HOST}:{WEBSOCKET_PORT}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())