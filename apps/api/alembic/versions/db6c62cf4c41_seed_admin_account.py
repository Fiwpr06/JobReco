"""seed_admin_account

Revision ID: db6c62cf4c41
Revises: 880f75eefcf5
Create Date: 2026-06-21 05:10:56.562028

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'db6c62cf4c41'
down_revision: Union[str, None] = '880f75eefcf5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from app.services.auth_service import AuthService

def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO users (email, hashed_password, full_name, role, is_active, is_verified, created_at)
        SELECT 'admin@jobmatching.com', '{AuthService.get_password_hash("Admin@123")}', 'System Admin', 'admin', true, true, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@jobmatching.com');
        """
    )

def downgrade() -> None:
    op.execute("DELETE FROM users WHERE email = 'admin@jobmatching.com';")
