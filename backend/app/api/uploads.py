from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import UploadOut
from app.storage import LocalStorageBackend

router = APIRouter(prefix="/uploads", tags=["uploads"])


async def save_upload(category: str, file: UploadFile, current_user: User, db: Session | None = None) -> UploadOut:
    data = await file.read()
    storage = LocalStorageBackend()
    try:
        stored = await storage.save(category, str(current_user.id), file.filename or "upload.jpg", file.content_type or "", data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if category == "avatars" and db is not None:
        current_user.profile.avatar_url = stored.url
        db.commit()
    return UploadOut(url=stored.url, path=stored.path)


@router.post("/repair-images", response_model=UploadOut)
async def upload_repair_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    return await save_upload("repair-images", file, current_user)


@router.post("/menu-images", response_model=UploadOut)
async def upload_menu_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    return await save_upload("menu-images", file, current_user)


@router.post("/repair-results", response_model=UploadOut)
async def upload_repair_result(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    return await save_upload("repair-results", file, current_user)


@router.post("/avatars", response_model=UploadOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await save_upload("avatars", file, current_user, db)


@router.delete("/files/{storage_path:path}")
def delete_file(storage_path: str, current_user: User = Depends(get_current_user)):
    if f"/{current_user.id}/" not in f"/{storage_path}":
        raise HTTPException(status_code=403, detail="Cannot delete another user's file")
    try:
        LocalStorageBackend().delete(storage_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}
