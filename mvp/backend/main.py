from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote
from typing import Dict, List, Set
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url_connections: Dict[str, List[WebSocket]] = {}
url_waiting_users: Dict[str, Set[str]] = {}

@app.websocket("/ws/{client_id}/{url:path}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, url: str):
    await websocket.accept()
    decoded_url = unquote(url)
    
    if decoded_url not in url_connections:
        url_connections[decoded_url] = []
        url_waiting_users[decoded_url] = set()
    
    url_connections[decoded_url].append(websocket)
    url_waiting_users[decoded_url].add(client_id)
    
    try:
        if len(url_waiting_users[decoded_url]) >= 2:
            for connection in url_connections[decoded_url]:
                await connection.send_json({
                    "type": "chat_start",
                    "message": "connected",
                    "participants": list(url_waiting_users[decoded_url])
                })
        
        while True:
            data = await websocket.receive_text()
            for connection in url_connections[decoded_url]:
                if connection != websocket:
                    await connection.send_json({
                        "type": "chat_message",
                        "sender": client_id,
                        "message": data
                    })
    
    except Exception as e:
        print(f"Error: {e}")
    finally:
        url_connections[decoded_url].remove(websocket)
        url_waiting_users[decoded_url].remove(client_id)
        
        for connection in url_connections[decoded_url]:
            await connection.send_json({
                "type": "user_left",
                "message": f"{client_id} left",
                "participants": list(url_waiting_users[decoded_url])
            })

@app.get("/")
def read_root():
    return {"success":True,
            "message": "Hello World"}

@app.get("/link/{url:path}")
def read_link(url: str):
    decoded_url = unquote(url)
    return {"success": True,
            "message": f"Received URL: {decoded_url}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
