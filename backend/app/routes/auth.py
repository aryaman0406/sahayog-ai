import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from pymongo.errors import DuplicateKeyError
from app.models import UserCreate, UserLogin, UserResponse, TokenResponse, ProfileUpdate
from app.auth import get_current_user, hash_password, verify_password, create_access_token
from app.database import get_database
from app.rag.memory import memory

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    db = get_database()
    
    # Hash password in a thread pool to avoid blocking the asyncio event loop
    hashed_password = await asyncio.to_thread(hash_password, user_data.password)
    
    user_dict = user_data.model_dump()
    user_dict["password"] = hashed_password
    user_dict["created_at"] = datetime.now()
    
    # Single database round-trip using unique index instead of separate find_one
    try:
        result = await db.users.insert_one(user_dict)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_dict["id"] = str(result.inserted_id)
    user_dict.pop("password", None)
    
    token = create_access_token({"sub": user_dict["email"], "uid": user_dict["id"]})
    return {"access_token": token, "token_type": "bearer", "user": user_dict}

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    db = get_database()
    user = await db.users.find_one(
        {"email": credentials.email},
        {"password": 1, "email": 1, "name": 1, "age": 1, "occupation": 1, "annual_income": 1, "location_type": 1, "gender": 1, "state": 1, "language": 1, "created_at": 1}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    valid = await asyncio.to_thread(verify_password, credentials.password, user["password"])
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user["id"] = str(user["_id"])
    user.pop("password", None)
    token = create_access_token({"sub": user["email"], "uid": user["id"]})
    
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user["id"] = str(current_user["_id"])
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_me(update_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_dict})
        current_user.update(update_dict)
        
    current_user["id"] = str(current_user["_id"])
    return current_user

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    session_id = str(current_user["_id"])
    memory.clear_session(session_id)
    return {"message": "Logged out successfully"}

@router.get("/me/stats")
async def get_me_stats(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])
    saved_count = await db.saved.count_documents({"user_id": user_id})
    total_searches = await db.sessions.count_documents({"user_id": user_id})
    
    return {
        "saved_count": saved_count,
        "last_active": datetime.now().isoformat(),
        "total_searches": total_searches
    }
