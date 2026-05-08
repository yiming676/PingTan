"""Add user active status.

Revision ID: 20260508_0004
Revises: 20260508_0003
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa


revision = "20260508_0004"
down_revision = "20260508_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "disabled_at")
    op.drop_column("users", "is_active")
