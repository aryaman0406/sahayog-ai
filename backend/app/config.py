import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load all env vars using python-dotenv
load_dotenv()

class Settings(BaseModel):
    GEMINI_API_KEY: str
    MONGO_URI: str
    JWT_SECRET: str
    JWT_EXPIRE_HOURS: int = 72
    ADMIN_KEY: str
    CHROMA_PATH: str = "./chroma_db"

try:
    settings = Settings(
        GEMINI_API_KEY=os.environ["GEMINI_API_KEY"],
        MONGO_URI=os.environ["MONGO_URI"],
        JWT_SECRET=os.environ["JWT_SECRET"],
        JWT_EXPIRE_HOURS=int(os.environ.get("JWT_EXPIRE_HOURS", 72)),
        ADMIN_KEY=os.environ["ADMIN_KEY"],
        CHROMA_PATH=os.environ.get("CHROMA_PATH", "./chroma_db")
    )
except KeyError as e:
    raise ValueError(f"Missing required environment variable: {e}")
except Exception as e:
    raise ValueError(f"Error loading configuration: {e}")
