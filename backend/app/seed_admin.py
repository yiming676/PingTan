from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Profile, User
from app.security import hash_password
from app.utils import normalize_phone_digits


def seed_admin(db: Session) -> None:
    if not settings.init_admin_phone or not settings.init_admin_password:
        print("INIT_ADMIN_PHONE or INIT_ADMIN_PASSWORD not set; skipping admin seed")
        return

    phone = normalize_phone_digits(settings.init_admin_phone)
    user = db.query(User).filter(User.phone == phone).first()
    if user:
        if not user.profile:
            user.profile = Profile(name=settings.init_admin_name, role="super_admin")
        user.profile.role = "super_admin"
        db.commit()
        print(f"Ensured super_admin for {phone}")
        return

    user = User(phone=phone, password_hash=hash_password(settings.init_admin_password))
    profile = Profile(user=user, name=settings.init_admin_name, role="super_admin")
    db.add(profile)
    db.commit()
    print(f"Created initial super_admin for {phone}")


def main() -> None:
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
