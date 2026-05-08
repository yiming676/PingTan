"""Add repair result images.

Revision ID: 20260508_0002
Revises: 20260507_0001
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260508_0002"
down_revision = "20260507_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "repair_result_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("repair_tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_repair_result_images_ticket", "repair_result_images", ["ticket_id"])


def downgrade() -> None:
    op.drop_index("ix_repair_result_images_ticket", table_name="repair_result_images")
    op.drop_table("repair_result_images")
