from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, or_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Notification, NotificationRead, User
from app.schemas import NotificationOut, NotificationReadIn

router = APIRouter(prefix="/notifications", tags=["notifications"])


def relevant_filter(user_id: UUID):
    return or_(Notification.target_user_id.is_(None), Notification.target_user_id == user_id)


@router.get("", response_model=list[NotificationOut])
def list_notifications(limit: int = 20, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Notification)
        .filter(relevant_filter(current_user.id))
        .order_by(Notification.created_at.desc())
        .limit(min(max(limit, 1), 100))
        .all()
    )


@router.get("/unread-count")
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = (
        db.query(func.count(Notification.id))
        .outerjoin(
            NotificationRead,
            and_(
                NotificationRead.notification_id == Notification.id,
                NotificationRead.user_id == current_user.id,
            ),
        )
        .filter(relevant_filter(current_user.id), NotificationRead.notification_id.is_(None))
        .scalar()
    )
    return {"count": int(count or 0)}


@router.post("/read")
def mark_read(payload: NotificationReadIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ids = list(dict.fromkeys(payload.notification_ids))
    if not ids:
        return {"ok": True}
    allowed = db.query(Notification.id).filter(Notification.id.in_(ids), relevant_filter(current_user.id)).all()
    allowed_ids = [row[0] for row in allowed]
    if allowed_ids:
        stmt = insert(NotificationRead).values(
            [{"user_id": current_user.id, "notification_id": notification_id, "read_at": datetime.utcnow()} for notification_id in allowed_ids]
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "notification_id"],
            set_={"read_at": datetime.utcnow()},
        )
        db.execute(stmt)
        db.commit()
    return {"ok": True}
