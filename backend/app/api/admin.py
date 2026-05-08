from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import require_roles
from app.models import MealBooking, MealMenu, Notification, Profile, RepairResultImage, RepairTicket, User
from app.schemas import (
    MealBookingOut,
    MealMenuOut,
    MenuSaveIn,
    MenuStatusIn,
    NotificationCreateIn,
    NotificationOut,
    ProfileOut,
    RepairTicketOut,
    RoleUpdateIn,
    TicketCompleteIn,
    TicketStatusIn,
    UploadedImage,
)
from app.serializers import booking_out, profile_out, ticket_out

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/menus", response_model=list[MealMenuOut])
def admin_menus(limit: int = 60, _: User = Depends(require_roles("canteen_admin")), db: Session = Depends(get_db)):
    return db.query(MealMenu).order_by(MealMenu.date.desc(), MealMenu.meal_type.asc()).limit(min(max(limit, 1), 200)).all()


@router.post("/menus", response_model=MealMenuOut)
def create_menu(payload: MenuSaveIn, _: User = Depends(require_roles("canteen_admin")), db: Session = Depends(get_db)):
    menu = (
        db.query(MealMenu)
        .filter(MealMenu.date == payload.date, MealMenu.meal_type == payload.meal_type)
        .first()
    )
    if menu:
        menu.items = payload.items
        menu.description = payload.description
        menu.image_url = payload.image_url
        menu.image_path = payload.image_path
        menu.time_range = payload.time_range
        menu.booking_status = payload.booking_status
    else:
        menu = MealMenu(**payload.model_dump())
        db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu


@router.put("/menus/{menu_id}", response_model=MealMenuOut)
def update_menu(menu_id: UUID, payload: MenuSaveIn, _: User = Depends(require_roles("canteen_admin")), db: Session = Depends(get_db)):
    menu = db.query(MealMenu).filter(MealMenu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    for key, value in payload.model_dump().items():
        setattr(menu, key, value)
    db.commit()
    db.refresh(menu)
    return menu


@router.patch("/menus/{menu_id}/status", response_model=MealMenuOut)
def update_menu_status(menu_id: UUID, payload: MenuStatusIn, _: User = Depends(require_roles("canteen_admin")), db: Session = Depends(get_db)):
    menu = db.query(MealMenu).filter(MealMenu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    menu.booking_status = payload.booking_status
    db.commit()
    db.refresh(menu)
    return menu


@router.delete("/menus/{menu_id}")
def delete_menu(menu_id: UUID, _: User = Depends(require_roles("canteen_admin")), db: Session = Depends(get_db)):
    menu = db.query(MealMenu).filter(MealMenu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    db.delete(menu)
    db.commit()
    return {"ok": True}


@router.get("/bookings", response_model=list[MealBookingOut])
def admin_bookings(limit: int = 120, _: User = Depends(require_roles("canteen_admin")), db: Session = Depends(get_db)):
    rows = (
        db.query(MealBooking)
        .options(joinedload(MealBooking.profile).joinedload(Profile.user))
        .order_by(MealBooking.updated_at.desc())
        .limit(min(max(limit, 1), 500))
        .all()
    )
    return [booking_out(row, include_profile=True) for row in rows]


@router.get("/tickets", response_model=list[RepairTicketOut])
def admin_tickets(limit: int = 100, _: User = Depends(require_roles("repair_admin")), db: Session = Depends(get_db)):
    rows = (
        db.query(RepairTicket)
        .options(
            joinedload(RepairTicket.profile).joinedload(Profile.user),
            joinedload(RepairTicket.repair_images),
            joinedload(RepairTicket.repair_result_images),
        )
        .order_by(RepairTicket.created_at.desc())
        .limit(min(max(limit, 1), 500))
        .all()
    )
    return [ticket_out(row, include_profile=True) for row in rows]


@router.patch("/tickets/{ticket_id}/status", response_model=RepairTicketOut)
def update_ticket_status(ticket_id: UUID, payload: TicketStatusIn, _: User = Depends(require_roles("repair_admin")), db: Session = Depends(get_db)):
    ticket = db.query(RepairTicket).filter(RepairTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = payload.status
    db.commit()
    db.refresh(ticket)
    return ticket_out(ticket)


@router.post("/tickets/{ticket_id}/complete", response_model=RepairTicketOut)
def complete_ticket(ticket_id: UUID, payload: TicketCompleteIn, _: User = Depends(require_roles("repair_admin")), db: Session = Depends(get_db)):
    ticket = (
        db.query(RepairTicket)
        .options(joinedload(RepairTicket.repair_result_images))
        .filter(RepairTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    result_images = payload.result_images
    if not result_images and payload.result_image_url and payload.result_image_path:
        result_images = [UploadedImage(url=payload.result_image_url, path=payload.result_image_path)]

    ticket.result_text = payload.result_text
    ticket.result_image_url = result_images[0].url if result_images else None
    ticket.result_image_path = result_images[0].path if result_images else None
    ticket.repair_result_images = [
        RepairResultImage(image_url=image.url, storage_path=image.path)
        for image in result_images
    ]
    ticket.status = "completed"
    ticket.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket_out(ticket)


@router.get("/notifications", response_model=list[NotificationOut])
def admin_notifications(limit: int = 80, _: User = Depends(require_roles("canteen_admin", "repair_admin")), db: Session = Depends(get_db)):
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(min(max(limit, 1), 200)).all()


@router.post("/notifications", response_model=NotificationOut)
def create_notification(payload: NotificationCreateIn, _: User = Depends(require_roles("canteen_admin", "repair_admin")), db: Session = Depends(get_db)):
    notice = Notification(**payload.model_dump())
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/notifications/{notification_id}")
def delete_notification(notification_id: UUID, _: User = Depends(require_roles("canteen_admin", "repair_admin")), db: Session = Depends(get_db)):
    notice = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notice)
    db.commit()
    return {"ok": True}


@router.get("/profiles", response_model=list[ProfileOut])
def admin_profiles(limit: int = 200, _: User = Depends(require_roles("canteen_admin", "repair_admin", "super_admin")), db: Session = Depends(get_db)):
    rows = (
        db.query(Profile)
        .options(joinedload(Profile.user))
        .order_by(Profile.created_at.desc())
        .limit(min(max(limit, 1), 500))
        .all()
    )
    return [profile_out(row) for row in rows]


@router.patch("/profiles/{user_id}/role", response_model=ProfileOut)
def update_role(user_id: UUID, payload: RoleUpdateIn, current_user: User = Depends(require_roles("super_admin")), db: Session = Depends(get_db)):
    profile = db.query(Profile).options(joinedload(Profile.user)).filter(Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile.user_id == current_user.id and payload.role != "super_admin":
        raise HTTPException(status_code=400, detail="Cannot remove your own super_admin role")
    profile.role = payload.role
    db.commit()
    db.refresh(profile)
    return profile_out(profile)
