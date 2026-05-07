import uuid

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models import Profile, User
from app.security import decode_access_token


def get_current_user(
    authorization: str | None = Header(default=None),
    token_cookie: str | None = Cookie(default=None, alias=settings.auth_cookie_name),
    db: Session = Depends(get_db),
) -> User:
    token: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif token_cookie:
        token = token_cookie

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject") from exc

    user = db.query(User).options(joinedload(User.profile)).filter(User.id == user_id).first()
    if not user or not user.profile:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.profile.role == "super_admin" or current_user.profile.role in roles:
            return current_user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return dependency


def profile_summary(profile: Profile) -> dict[str, str | None]:
    user = profile.user
    return {
        "name": profile.name,
        "phone": user.phone if user else None,
        "email": user.email if user else None,
    }
