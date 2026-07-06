from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime
import logging

from app.database import connect_to_mongo, close_mongo_connection
from app.routes.auth import router as auth_router
from app.routes.schemes import router as schemes_router
from app.routes.match import router as match_router
from app.routes.chat import router as chat_router, ws_router as chat_ws_router
from app.routes.saved import router as saved_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Sahayog AI...")
    try:
        await connect_to_mongo()
        logger.info("MongoDB connection verified.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        
    try:
        from app.rag.embedder import build_index, get_index_stats
        index_result = build_index()
        logger.info(f"RAG Index built: {index_result}")
    except Exception as e:
        logger.warning(f"RAG index not available (AI features disabled): {e}")
        
    print("Sahayog AI ready")
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(title="Sahayog AI", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error occurred."}
    )

# Routers
app.include_router(auth_router)
app.include_router(schemes_router)
app.include_router(match_router)
app.include_router(chat_router)
app.include_router(chat_ws_router)
app.include_router(saved_router)

@app.get("/")
async def root():
    try:
        from app.rag.embedder import get_index_stats
        index_stats = get_index_stats()
    except Exception:
        index_stats = {"error": "Index not available"}
        
    return {
        "service": "Sahayog AI",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "index_stats": index_stats
    }

@app.get("/api/health")
async def health_check():
    try:
        from app.database import db
        if db.client:
            await db.client.admin.command('ping')
            mongo_status = "connected"
        else:
            mongo_status = "disconnected"
    except Exception:
        mongo_status = "error"
        
    try:
        from app.rag.embedder import get_index_stats
        index_stats = get_index_stats()
    except Exception:
        index_stats = {"error": "Index not available"}
        
    return {
        "status": "ok",
        "mongodb": mongo_status,
        "rag_index": index_stats,
        "timestamp": datetime.now().isoformat()
    }
