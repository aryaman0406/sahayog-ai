import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient | None = None

db = Database()

def get_database():
    if db.client is None:
        raise RuntimeError("Database client is not initialized")
    return db.client.sahayog_ai

async def _ensure_indexes(database):
    try:
        await asyncio.gather(
            database.users.create_index("email", unique=True, background=True),
            database.saved.create_index([("user_id", 1), ("scheme_id", 1)], unique=True, background=True),
            database.saved.create_index([("user_id", 1), ("saved_at", -1)], background=True),
            database.sessions.create_index([("user_id", 1), ("created_at", -1)], background=True),
            return_exceptions=True
        )
        logger.info("MongoDB indexes verified in background.")
    except Exception as e:
        logger.warning(f"Background index creation warning: {e}")

async def connect_to_mongo():
    try:
        db.client = AsyncIOMotorClient(
            settings.MONGO_URI,
            minPoolSize=5,
            maxPoolSize=50,
            maxIdleTimeMS=45000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
        )
        # Verify connection instantly
        await db.client.admin.command('ping')
        database = db.client.sahayog_ai
        # Ensure indexes concurrently without blocking startup
        asyncio.create_task(_ensure_indexes(database))
        print("MongoDB connected")
        logger.info("MongoDB connected")
    except Exception as e:
        print(f"MongoDB failed: {e}")
        logger.error(f"MongoDB failed: {e}")
        raise e

async def close_mongo_connection():
    if db.client is not None:
        db.client.close()
