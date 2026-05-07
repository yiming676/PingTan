from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import MealBooking, MealMenu, User
from app.schemas import MealBookingCreateIn, MealBookingOut, MealMenuOut
from app.serializers import booking_out

router = APIRouter(tags=["meals"])


@router.get("/meal-menus", response_model=list[MealMenuOut])
def menus_for_date(date: date, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(MealMenu).filter(MealMenu.date == date).order_by(MealMenu.meal_type.asc()).all()


@router.get("/meal-bookings", response_model=list[MealBookingOut])
def bookings_for_date(date: date, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(MealBooking)
        .filter(MealBooking.user_id == current_user.id, MealBooking.date == date)
        .order_by(MealBooking.updated_at.desc())
        .all()
    )
    return [booking_out(row) for row in rows]


@router.get("/meal-bookings/recent", response_model=list[MealBookingOut])
def recent_bookings(limit: int = 5, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(MealBooking)
        .filter(MealBooking.user_id == current_user.id)
        .order_by(MealBooking.updated_at.desc())
        .limit(min(max(limit, 1), 50))
        .all()
    )
    return [booking_out(row) for row in rows]


@router.post("/meal-bookings", response_model=MealBookingOut)
def book_meal(payload: MealBookingCreateIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    menu = db.query(MealMenu).filter(MealMenu.id == payload.menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if menu.booking_status != "open":
        raise HTTPException(status_code=400, detail="Menu booking is closed")
    if menu.date != payload.date or menu.meal_type != payload.meal_type:
        raise HTTPException(status_code=400, detail="Menu does not match date or meal type")

    clean_items = [
        {"name": item.name.strip(), "quantity": max(0, int(item.quantity))}
        for item in payload.selected_items
        if item.name.strip() and item.quantity > 0
    ]
    if not clean_items:
        raise HTTPException(status_code=400, detail="At least one meal item is required")

    booking = (
        db.query(MealBooking)
        .filter(
            MealBooking.user_id == current_user.id,
            MealBooking.date == payload.date,
            MealBooking.meal_type == payload.meal_type,
        )
        .first()
    )
    if booking:
        booking.menu_id = payload.menu_id
        booking.selected_items = clean_items
        booking.status = "booked"
    else:
        booking = MealBooking(
            user_id=current_user.id,
            menu_id=payload.menu_id,
            date=payload.date,
            meal_type=payload.meal_type,
            selected_items=clean_items,
            status="booked",
        )
        db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking_out(booking)


@router.patch("/meal-bookings/{booking_id}/cancel", response_model=MealBookingOut)
def cancel_booking(booking_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = db.query(MealBooking).filter(MealBooking.id == booking_id, MealBooking.user_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return booking_out(booking)
