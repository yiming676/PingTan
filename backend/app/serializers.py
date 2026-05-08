from app.models import MealBooking, Profile, RepairTicket, User


def profile_out(profile: Profile, user: User | None = None) -> dict:
    owner = user or profile.user
    return {
        "id": profile.user_id,
        "teacher_no": profile.teacher_no,
        "name": profile.name,
        "email": owner.email if owner else None,
        "phone": owner.phone if owner else None,
        "role": profile.role,
        "avatar_url": profile.avatar_url,
        "is_active": owner.is_active if owner else True,
        "disabled_at": owner.disabled_at if owner else None,
        "created_at": profile.created_at,
    }


def user_out(user: User) -> dict:
    return {"id": user.id, "phone": user.phone, "email": user.email}


def booking_out(booking: MealBooking, include_profile: bool = False) -> dict:
    result = {
        "id": booking.id,
        "user_id": booking.user_id,
        "menu_id": booking.menu_id,
        "date": booking.date,
        "meal_type": booking.meal_type,
        "selected_items": booking.selected_items or [],
        "status": booking.status,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
    }
    if include_profile and booking.profile:
        result["profiles"] = {
            "name": booking.profile.name,
            "phone": booking.profile.user.phone if booking.profile.user else None,
            "email": booking.profile.user.email if booking.profile.user else None,
        }
    return result


def ticket_out(ticket: RepairTicket, include_profile: bool = False) -> dict:
    result = {
        "id": ticket.id,
        "user_id": ticket.user_id,
        "fault_type": ticket.fault_type,
        "location": ticket.location,
        "description": ticket.description,
        "status": ticket.status,
        "result_text": ticket.result_text,
        "result_image_url": ticket.result_image_url,
        "result_image_path": ticket.result_image_path,
        "completed_at": ticket.completed_at,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "repair_images": ticket.repair_images or [],
        "repair_result_images": ticket.repair_result_images or [],
    }
    if include_profile and ticket.profile:
        result["profiles"] = {
            "name": ticket.profile.name,
            "phone": ticket.profile.user.phone if ticket.profile.user else None,
            "email": ticket.profile.user.email if ticket.profile.user else None,
        }
    return result
