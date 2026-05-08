from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import Profile, User
from app.schemas import AuthLoginIn, AuthOut, AuthRegisterIn, ProfileOut, ProfileUpdateIn
from app.security import create_access_token, hash_password, verify_password
from app.serializers import profile_out, user_out
from app.utils import normalize_phone_digits

router = APIRouter(prefix="/auth", tags=["auth"])
profile_router = APIRouter(prefix="/profile", tags=["profile"])


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        settings.auth_cookie_name,
        token,
        max_age=settings.jwt_expire_minutes * 60,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=AuthOut)
def register(payload: AuthRegisterIn, response: Response, db: Session = Depends(get_db)):
    phone = normalize_phone_digits(payload.phone)
    if not phone or not phone.startswith("1") or len(phone) != 11:
        raise HTTPException(status_code=400, detail="Phone number must be 11 digits")

    email = str(payload.email).lower() if payload.email else None
    existing = db.query(User).filter(or_(User.phone == phone, User.email == email) if email else User.phone == phone).first()
    if existing:
        raise HTTPException(status_code=409, detail="Phone or email already exists")

    user = User(phone=phone, email=email, password_hash=hash_password(payload.password))
    profile = Profile(
        user=user,
        name=payload.name.strip(),
        teacher_no=(payload.teacher_no or "").strip() or None,
        role="teacher",
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    db.refresh(profile)

    token = create_access_token(str(user.id), {"role": profile.role})
    set_auth_cookie(response, token)
    return {"token": token, "user": user_out(user), "profile": profile_out(profile, user)}


@router.post("/login", response_model=AuthOut)
def login(payload: AuthLoginIn, response: Response, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip()
    phone = normalize_phone_digits(identifier)
    query = db.query(User)
    if "@" in identifier:
        user = query.filter(User.email == identifier.lower()).first()
    else:
        user = query.filter(User.phone == phone).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password")

    token = create_access_token(str(user.id), {"role": user.profile.role})
    set_auth_cookie(response, token)
    return {"token": token, "user": user_out(user), "profile": profile_out(user.profile, user)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(settings.auth_cookie_name, path="/")
    return {"ok": True}


@router.get("/me", response_model=AuthOut)
def me(current_user: User = Depends(get_current_user)):
    token = create_access_token(str(current_user.id), {"role": current_user.profile.role})
    return {"token": token, "user": user_out(current_user), "profile": profile_out(current_user.profile, current_user)}


@profile_router.patch("/me", response_model=ProfileOut)
def update_profile(payload: ProfileUpdateIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    phone = normalize_phone_digits(payload.phone)
    if phone and (not phone.startswith("1") or len(phone) != 11):
        raise HTTPException(status_code=400, detail="Phone number must be 11 digits")
    email = str(payload.email).lower() if payload.email else None

    duplicate = db.query(User).filter(User.phone == phone, User.id != current_user.id).first() if phone else None
    if duplicate:
        raise HTTPException(status_code=409, detail="Phone number is already bound to another account")
    duplicate_email = db.query(User).filter(User.email == email, User.id != current_user.id).first() if email else None
    if duplicate_email:
        raise HTTPException(status_code=409, detail="Email is already bound to another account")

    current_user.phone = phone
    current_user.email = email
    current_user.profile.name = payload.name.strip()
    db.commit()
    db.refresh(current_user)
    db.refresh(current_user.profile)
    return profile_out(current_user.profile, current_user)
