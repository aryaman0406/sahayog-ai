from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
from app.models import ChatRequest
from app.rag.memory import memory

def _rag_generate(*args, **kwargs):
    from app.rag.generator import rag_generate
    return rag_generate(*args, **kwargs)

async def _rag_stream(*args, **kwargs):
    from app.rag.generator import rag_stream
    async for chunk in rag_stream(*args, **kwargs):
        yield chunk

def _semantic_search(query, n_results=5):
    try:
        from app.rag.embedder import semantic_search
        return semantic_search(query, n_results=n_results)
    except Exception:
        return []

router = APIRouter(prefix="/api/chat", tags=["chat"])
ws_router = APIRouter(tags=["chat-ws"])

@ws_router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            if not message:
                continue
                
            profile = data.get("profile", {})
            session_id = data.get("session_id", "default")
            language = data.get("language", "en")
            
            await websocket.send_json({"type": "thinking", "content": "Finding relevant schemes..."})
            
            async for chunk in _rag_stream(message, profile, session_id, language):
                await websocket.send_json({"type": "token", "content": chunk})
                
            semantic_results = _semantic_search(message, n_results=5)
            schemes_used = [s.get("name") for s in semantic_results if s.get("name")]
            
            await websocket.send_json({
                "type": "done",
                "schemes_used": schemes_used,
                "session_id": session_id
            })
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "content": str(e)})

@router.post("/")
async def chat_http(request: ChatRequest):
    reply = _rag_generate(
        user_message=request.message,
        profile=request.profile,
        session_id=request.session_id,
        language=request.language
    )
    
    semantic_results = _semantic_search(request.message, n_results=5)
    schemes_used = [s.get("name") for s in semantic_results if s.get("name")]
    
    return {
        "reply": reply,
        "session_id": request.session_id,
        "language": request.language,
        "schemes_used": schemes_used
    }

@router.get("/history/{session_id}")
async def get_history(session_id: str):
    history = memory.get_history(session_id)
    return {
        "session_id": session_id,
        "messages": history,
        "count": len(history)
    }

@router.delete("/history/{session_id}")
async def delete_history(session_id: str):
    cleared = memory.clear_session(session_id)
    return {
        "cleared": cleared,
        "session_id": session_id
    }

@router.get("/stats")
async def chat_stats():
    return memory.get_stats()
