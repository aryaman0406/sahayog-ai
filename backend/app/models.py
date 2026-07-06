from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    age: int = Field(ge=1, le=120)
    occupation: str
    annual_income: int = Field(ge=0)
    location_type: Literal["rural", "urban"]
    gender: Literal["male", "female", "other"]
    state: str = ""
    language: Literal["en", "hi", "ta", "mr", "bn", "te", "gu", "kn"] = "en"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    age: int
    occupation: str
    annual_income: int
    location_type: str
    gender: str
    state: str
    language: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProfileUpdate(BaseModel):
    age: Optional[int] = None
    occupation: Optional[str] = None
    annual_income: Optional[int] = None
    location_type: Optional[str] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    language: Optional[str] = None

class MatchRequest(BaseModel):
    age: int
    occupation: str
    annual_income: int
    location_type: str
    gender: Optional[str] = None
    state: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    profile: dict
    session_id: str
    language: str = "en"

class SavedSchemeCreate(BaseModel):
    scheme_id: str
