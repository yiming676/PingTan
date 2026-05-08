from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import RepairImage, RepairTicket, User
from app.schemas import RepairTicketCreateIn, RepairTicketOut, RepairTicketUpdateIn
from app.serializers import ticket_out

router = APIRouter(prefix="/repair-tickets", tags=["repairs"])

USER_MUTABLE_TICKET_STATUSES = {"pending", "processing"}


@router.get("/mine", response_model=list[RepairTicketOut])
def my_tickets(limit: int = 10, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(RepairTicket)
        .options(
            joinedload(RepairTicket.repair_images),
            joinedload(RepairTicket.repair_result_images),
        )
        .filter(RepairTicket.user_id == current_user.id)
        .order_by(RepairTicket.created_at.desc())
        .limit(min(max(limit, 1), 100))
        .all()
    )
    return [ticket_out(row) for row in rows]


@router.post("", response_model=RepairTicketOut)
def create_ticket(payload: RepairTicketCreateIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ticket = RepairTicket(
        user_id=current_user.id,
        fault_type=payload.fault_type,
        location=payload.location,
        description=payload.description,
    )
    db.add(ticket)
    db.flush()

    for image in payload.images:
        db.add(RepairImage(ticket_id=ticket.id, image_url=image.url, storage_path=image.path))

    db.commit()
    db.refresh(ticket)
    return ticket_out(ticket)


@router.patch("/{ticket_id}", response_model=RepairTicketOut)
def update_ticket(
    ticket_id: UUID,
    payload: RepairTicketUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(RepairTicket)
        .options(joinedload(RepairTicket.repair_images), joinedload(RepairTicket.repair_result_images))
        .filter(RepairTicket.id == ticket_id, RepairTicket.user_id == current_user.id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status not in USER_MUTABLE_TICKET_STATUSES:
        raise HTTPException(status_code=400, detail="Completed tickets cannot be edited")

    ticket.fault_type = payload.fault_type
    ticket.location = payload.location
    ticket.description = payload.description
    ticket.repair_images = [
        RepairImage(image_url=image.url, storage_path=image.path)
        for image in payload.images
    ]
    db.commit()
    db.refresh(ticket)
    return ticket_out(ticket)


@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(RepairTicket)
        .filter(RepairTicket.id == ticket_id, RepairTicket.user_id == current_user.id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status not in USER_MUTABLE_TICKET_STATUSES:
        raise HTTPException(status_code=400, detail="Completed tickets cannot be deleted")

    db.delete(ticket)
    db.commit()
    return {"ok": True}
