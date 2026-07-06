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

async def connect_to_mongo():
    try:
        db.client = AsyncIOMotorClient(settings.MONGO_URI)
        # Verify connection
        await db.client.admin.command('ping')
        print("MongoDB connected")
        logger.info("MongoDB connected")
    except Exception as e:
        print(f"MongoDB failed: {e}")
        logger.error(f"MongoDB failed: {e}")
        raise e

async def close_mongo_connection():
    if db.client is not None:
        db.client.close()
