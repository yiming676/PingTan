import uuid
from datetime import date, datetime

from sqlalchemy import JSON, CheckConstraint, Date, DateTime, ForeignKey, String, Text, Uuid, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    profile: Mapped["Profile"] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"
    __table_args__ = (
        CheckConstraint(
            "role in ('teacher','canteen_admin','repair_admin','canteen_repair_admin','super_admin')",
            name="profiles_role_check",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    teacher_no: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="teacher")

    user: Mapped[User] = relationship(back_populates="profile")
    bookings: Mapped[list["MealBooking"]] = relationship(back_populates="profile")
    tickets: Mapped[list["RepairTicket"]] = relationship(back_populates="profile")


class MealMenu(Base, TimestampMixin):
    __tablename__ = "meal_menus"
    __table_args__ = (
        UniqueConstraint("date", "meal_type", name="uq_meal_menus_date_type"),
        CheckConstraint("meal_type in ('breakfast','lunch','dinner')", name="meal_menus_meal_type_check"),
        CheckConstraint("booking_status in ('open','closed')", name="meal_menus_booking_status_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    items: Mapped[list[dict] | list[str]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    time_range: Mapped[str | None] = mapped_column(String(128), nullable=True)
    booking_status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")

    bookings: Mapped[list["MealBooking"]] = relationship(back_populates="menu")


class MealBooking(Base, TimestampMixin):
    __tablename__ = "meal_bookings"
    __table_args__ = (
        UniqueConstraint("user_id", "date", "meal_type", name="uq_meal_bookings_user_date_type"),
        CheckConstraint("meal_type in ('breakfast','lunch','dinner')", name="meal_bookings_meal_type_check"),
        CheckConstraint("status in ('booked','cancelled')", name="meal_bookings_status_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.user_id", ondelete="CASCADE"), nullable=False)
    menu_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("meal_menus.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    selected_items: Mapped[list[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="booked")

    profile: Mapped[Profile] = relationship(back_populates="bookings")
    menu: Mapped[MealMenu] = relationship(back_populates="bookings")


class RepairTicket(Base, TimestampMixin):
    __tablename__ = "repair_tickets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.user_id", ondelete="CASCADE"), nullable=False)
    fault_type: Mapped[str] = mapped_column(String(128), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending")
    result_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    profile: Mapped[Profile] = relationship(back_populates="tickets")
    repair_images: Mapped[list["RepairImage"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    repair_result_images: Mapped[list["RepairResultImage"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")


class RepairImage(Base):
    __tablename__ = "repair_images"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repair_tickets.id", ondelete="CASCADE"), nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket: Mapped[RepairTicket] = relationship(back_populates="repair_images")


class RepairResultImage(Base):
    __tablename__ = "repair_result_images"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repair_tickets.id", ondelete="CASCADE"), nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket: Mapped[RepairTicket] = relationship(back_populates="repair_result_images")


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint("type in ('info','warning','urgent')", name="notifications_type_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, default="info")
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("profiles.user_id", ondelete="CASCADE"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class NotificationRead(Base):
    __tablename__ = "notification_reads"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.user_id", ondelete="CASCADE"), primary_key=True)
    notification_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notifications.id", ondelete="CASCADE"), primary_key=True)
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
