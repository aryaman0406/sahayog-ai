import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models import ChatRequest
from app.rag.memory import memory

logger = logging.getLogger(__name__)

async def _rag_stream(*args, **kwargs):
    from app.rag.generator import rag_stream
    async for chunk in rag_stream(*args, **kwargs):
        yield chunk

def _rag_generate(*args, **kwargs):
    from app.rag.generator import rag_generate
    return rag_generate(*args, **kwargs)

def _extract_profile(text: str) -> dict:
    """Run profile extraction (Gemini + regex fallback)."""
    try:
        from app.rag.profile_extractor import extract_profile
        return extract_profile(text)
    except Exception as e:
        logger.warning(f"Profile extraction failed: {e}")
        return {}

router = APIRouter(prefix="/api/chat", tags=["chat"])
ws_router = APIRouter(tags=["chat-ws"])

@ws_router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "").strip()
            if not message:
                continue

            profile = data.get("profile", {})
            session_id = data.get("session_id", "default")
            language = data.get("language", "en")

            # Stream the RAG response
            async for chunk in _rag_stream(message, profile, session_id, language):
                await websocket.send_json({"type": "token", "content": chunk})

            await websocket.send_json({"type": "done", "session_id": session_id})

            # After response is done, extract profile fields from user message
            # This is non-blocking for the chat UX — user already has their answer
            try:
                extracted = _extract_profile(message)
                if extracted:
                    await websocket.send_json({
                        "type": "profile_extracted",
                        "profile": extracted
                    })
                    logger.info(f"Profile extracted from chat: {extracted}")
            except Exception as e:
                logger.warning(f"Profile extraction send failed: {e}")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


@router.post("/")
async def chat_http(request: ChatRequest):
    reply = _rag_generate(
        user_message=request.message,
        profile=request.profile,
        session_id=request.session_id,
        language=request.language,
    )
    return {
        "reply": reply,
        "session_id": request.session_id,
        "language": request.language,
    }


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    history = memory.get_history(session_id)
    return {"session_id": session_id, "messages": history, "count": len(history)}


@router.delete("/history/{session_id}")
async def delete_history(session_id: str):
    cleared = memory.clear_session(session_id)
    return {"cleared": cleared, "session_id": session_id}


@router.get("/stats")
async def chat_stats():
    return memory.get_stats()
