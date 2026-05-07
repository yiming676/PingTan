"""initial schema

Revision ID: 20260507_0001
Revises:
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260507_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("phone", sa.String(length=32), nullable=False, unique=True),
        sa.Column("email", sa.String(length=255), nullable=True, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_phone", "users", ["phone"])

    op.create_table(
        "profiles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("teacher_no", sa.String(length=64), nullable=True, unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="teacher"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("role in ('teacher','canteen_admin','repair_admin','super_admin')", name="profiles_role_check"),
    )

    op.create_table(
        "meal_menus",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("meal_type", sa.String(length=32), nullable=False),
        sa.Column("items", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_path", sa.Text(), nullable=True),
        sa.Column("time_range", sa.String(length=128), nullable=True),
        sa.Column("booking_status", sa.String(length=16), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("date", "meal_type", name="uq_meal_menus_date_type"),
        sa.CheckConstraint("meal_type in ('breakfast','lunch','dinner')", name="meal_menus_meal_type_check"),
        sa.CheckConstraint("booking_status in ('open','closed')", name="meal_menus_booking_status_check"),
    )
    op.create_index("ix_meal_menus_date_type", "meal_menus", ["date", "meal_type"])

    op.create_table(
        "meal_bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("menu_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meal_menus.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("meal_type", sa.String(length=32), nullable=False),
        sa.Column("selected_items", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="booked"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "date", "meal_type", name="uq_meal_bookings_user_date_type"),
        sa.CheckConstraint("meal_type in ('breakfast','lunch','dinner')", name="meal_bookings_meal_type_check"),
        sa.CheckConstraint("status in ('booked','cancelled')", name="meal_bookings_status_check"),
    )
    op.create_index("ix_meal_bookings_user_date", "meal_bookings", ["user_id", "date"])
    op.create_index("ix_meal_bookings_date_type", "meal_bookings", ["date", "meal_type"])

    op.create_table(
        "repair_tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("fault_type", sa.String(length=128), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="pending"),
        sa.Column("result_text", sa.Text(), nullable=True),
        sa.Column("result_image_url", sa.Text(), nullable=True),
        sa.Column("result_image_path", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_repair_tickets_user_created", "repair_tickets", ["user_id", "created_at"])
    op.create_index("ix_repair_tickets_status_created", "repair_tickets", ["status", "created_at"])

    op.create_table(
        "repair_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("repair_tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_repair_images_ticket", "repair_images", ["ticket_id"])

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False, server_default="info"),
        sa.Column("target_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.user_id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("type in ('info','warning','urgent')", name="notifications_type_check"),
    )
    op.create_index("ix_notifications_created_target", "notifications", ["created_at", "target_user_id"])

    op.create_table(
        "notification_reads",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.user_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("notification_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("notifications.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notification_reads_notification", "notification_reads", ["notification_id"])


def downgrade() -> None:
    op.drop_table("notification_reads")
    op.drop_table("notifications")
    op.drop_table("repair_images")
    op.drop_table("repair_tickets")
    op.drop_table("meal_bookings")
    op.drop_table("meal_menus")
    op.drop_table("profiles")
    op.drop_table("users")
