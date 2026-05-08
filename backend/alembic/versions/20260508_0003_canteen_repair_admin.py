"""Allow combined canteen and repair admin role.

Revision ID: 20260508_0003
Revises: 20260508_0002
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa


revision = "20260508_0003"
down_revision = "20260508_0002"
branch_labels = None
depends_on = None


ROLE_CHECK = "role in ('teacher','canteen_admin','repair_admin','canteen_repair_admin','super_admin')"
PREVIOUS_ROLE_CHECK = "role in ('teacher','canteen_admin','repair_admin','super_admin')"


def upgrade() -> None:
    op.drop_constraint("profiles_role_check", "profiles", type_="check")
    op.create_check_constraint("profiles_role_check", "profiles", sa.text(ROLE_CHECK))


def downgrade() -> None:
    op.execute("update profiles set role = 'canteen_admin' where role = 'canteen_repair_admin'")
    op.drop_constraint("profiles_role_check", "profiles", type_="check")
    op.create_check_constraint("profiles_role_check", "profiles", sa.text(PREVIOUS_ROLE_CHECK))
