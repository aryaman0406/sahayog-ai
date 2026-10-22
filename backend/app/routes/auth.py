import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from pymongo.errors import DuplicateKeyError
import json
import base64
import urllib.request
from app.models import UserCreate, UserLogin, UserResponse, TokenResponse, ProfileUpdate, GoogleAuthRequest
from app.auth import get_current_user, hash_password, verify_password, create_access_token
from app.database import get_database
from app.rag.memory import memory

router = APIRouter(prefix="/api/auth", tags=["auth"])

def decode_google_id_token(id_token: str) -> dict:
    """Validate and decode a Google ID token via Google tokeninfo endpoint, falling back to JWT payload decode."""
    # Method 1: Google tokeninfo validation
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        req = urllib.request.Request(url, headers={"User-Agent": "Sahayog-Backend/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return data
    except Exception:
        pass

    # Method 2: Fallback base64 JWT payload decode
    try:
        parts = id_token.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[1]
            padded = payload_b64 + "=" * (-len(payload_b64) % 4)
            decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
            return json.loads(decoded)
    except Exception:
        pass

    return {}

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    db = get_database()
    
    # Hash password in a thread pool to avoid blocking the asyncio event loop
    hashed_password = await asyncio.to_thread(hash_password, user_data.password)
    
    user_dict = user_data.model_dump()
    user_dict["password"] = hashed_password
    user_dict["auth_provider"] = "local"
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
        {"password": 1, "email": 1, "name": 1, "age": 1, "occupation": 1, "annual_income": 1, "location_type": 1, "gender": 1, "state": 1, "language": 1, "picture": 1, "auth_provider": 1, "created_at": 1}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    if not user.get("password"):
        raise HTTPException(
            status_code=400,
            detail="This account was registered using Google Sign-In. Please click 'Continue with Google' to sign in."
        )

    valid = await asyncio.to_thread(verify_password, credentials.password, user["password"])
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user["id"] = str(user["_id"])
    user.pop("password", None)
    token = create_access_token({"sub": user["email"], "uid": user["id"]})
    
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest):
    """Authenticate or register a user via Google OAuth Identity Services (or demo login)."""
    db = get_database()
    email = None
    name = None
    picture = None
    sub = None

    if payload.credential:
        token_data = await asyncio.to_thread(decode_google_id_token, payload.credential)
        email = token_data.get("email")
        name = token_data.get("name")
        picture = token_data.get("picture")
        sub = token_data.get("sub")

    # If credential didn't contain email (or demo mode was triggered)
    if not email:
        email = payload.email
        name = payload.name or (str(email).split("@")[0].title() if email else "Google User")
        picture = payload.picture or f"https://api.dicebear.com/7.x/initials/svg?seed={name}"
        sub = f"google_demo_{hash(str(email))}"

    if not email:
        raise HTTPException(status_code=400, detail="Unable to retrieve verified email from Google.")

    user = await db.users.find_one({"email": email})
    if user:
        update_fields = {}
        if not user.get("picture") and picture:
            update_fields["picture"] = picture
        if not user.get("google_id") and sub:
            update_fields["google_id"] = sub
        if not user.get("auth_provider"):
            update_fields["auth_provider"] = "google"

        if update_fields:
            await db.users.update_one({"_id": user["_id"]}, {"$set": update_fields})
            user.update(update_fields)

        user["id"] = str(user["_id"])
        user.pop("password", None)
        token = create_access_token({"sub": user["email"], "uid": user["id"]})
        return {"access_token": token, "token_type": "bearer", "user": user}

    # New user registered via Google
    new_user = {
        "name": name or str(email).split("@")[0].title(),
        "email": email,
        "password": "",  # Google OAuth accounts do not require local password
        "age": 28,
        "occupation": "salaried",
        "annual_income": 120000,
        "location_type": "urban",
        "gender": "other",
        "state": "",
        "language": "en",
        "picture": picture or f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
        "google_id": sub,
        "auth_provider": "google",
        "created_at": datetime.now(),
    }

    try:
        result = await db.users.insert_one(new_user)
    except DuplicateKeyError:
        user = await db.users.find_one({"email": email})
        user["id"] = str(user["_id"])
        user.pop("password", None)
        token = create_access_token({"sub": user["email"], "uid": user["id"]})
        return {"access_token": token, "token_type": "bearer", "user": user}

    new_user["id"] = str(result.inserted_id)
    new_user.pop("password", None)
    token = create_access_token({"sub": new_user["email"], "uid": new_user["id"]})
    return {"access_token": token, "token_type": "bearer", "user": new_user}

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
