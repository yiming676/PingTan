from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import RepairImage, RepairTicket, User
from app.schemas import RepairTicketCreateIn, RepairTicketOut
from app.serializers import ticket_out

router = APIRouter(prefix="/repair-tickets", tags=["repairs"])


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
