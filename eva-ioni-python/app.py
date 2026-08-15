"""
EVA IONI 2.0 - Main Application
Robot open-source per orti urbani con AI, sensori ambientali e irrigazione autonoma
"""

import asyncio
import random
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from src.api.routes import router
from src.sensors.environmental import environmental
from src.irrigation.controller import irrigation
from src.biodiversity.mapper import biodiversity
from src.ai.recommendations import ai_recommendations

app = FastAPI(
    title="EVA IONI 2.0",
    description="Robot open-source per orti urbani con AI, sensori ambientali e irrigazione autonoma",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra le route API
app.include_router(router)

# WebSocket connections
active_connections = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    print(f"🔌 Client connected ({len(active_connections)} active)")
    
    try:
        while True:
            data = await websocket.receive_text()
            print(f"📡 Command: {data}")
            await websocket.send_json({
                "sensors": environmental.get_current_data(),
                "irrigation": irrigation.get_report(),
                "biodiversity": biodiversity.get_report(),
                "ai": ai_recommendations.get_stats()
            })
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"🔌 Client disconnected ({len(active_connections)} remaining)")

@app.on_event("startup")
async def startup_event():
    print("""
╔═══════════════════════════════════════════════════════╗
║  🌱 EVA IONI 2.0 - Robot for Urban Gardens         ║
║  🚀 Version: 2.0.0                                  ║
║  🌐 API: http://localhost:5015/api/eva             ║
║  🔌 WebSocket: ws://localhost:5015/ws              ║
╚═══════════════════════════════════════════════════════╝
    """)
    print("📡 Services started:")
    print("  🌍 Environmental sensors monitoring")
    print("  💧 Irrigation system ready")
    print("  🗺️  Biodiversity mapping active")
    print("  🧠 AI recommendations engine running")

@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 EVA IONI 2.0 shutting down...")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5015)
