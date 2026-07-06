from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from app.models import SavedSchemeCreate
from app.auth import get_current_user
from app.database import get_database
from app.data.schemes import get_scheme_by_id

router = APIRouter(prefix="/api/saved", tags=["saved"])

@router.get("/")
async def get_saved_schemes(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])

    cursor = db.saved.find({"user_id": user_id}).sort("saved_at", -1)
    saved_docs = await cursor.to_list(length=100)

    # Enrich each saved entry with full scheme data from JSON
    enriched = []
    for doc in saved_docs:
        scheme_id = doc.get("scheme_id")
        scheme_data = get_scheme_by_id(scheme_id) if scheme_id else None
        enriched.append({
            "_id": str(doc["_id"]),
            "scheme_id": scheme_id,
            "saved_at": doc.get("saved_at"),
            "scheme": scheme_data  # full scheme object, or None if not found
        })

    return {
        "saved": enriched,
        "count": len(enriched)
    }

@router.post("/")
async def save_scheme(scheme_data: SavedSchemeCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])

    existing = await db.saved.find_one({
        "user_id": user_id,
        "scheme_id": scheme_data.scheme_id
    })

    if existing:
        raise HTTPException(status_code=400, detail="Already saved")

    doc = {
        "user_id": user_id,
        "scheme_id": scheme_data.scheme_id,
        "saved_at": datetime.now()
    }

    result = await db.saved.insert_one(doc)

    return {
        "message": "Saved",
        "saved_id": str(result.inserted_id)
    }

@router.delete("/{scheme_id}")
async def remove_saved_scheme(scheme_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])

    result = await db.saved.delete_one({
        "user_id": user_id,
        "scheme_id": scheme_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved scheme not found")

    return {"message": "Removed", "scheme_id": scheme_id}

@router.get("/check/{scheme_id}")
async def check_saved(scheme_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])

    existing = await db.saved.find_one({
        "user_id": user_id,
        "scheme_id": scheme_id
    })

    return {"is_saved": existing is not None, "scheme_id": scheme_id}
