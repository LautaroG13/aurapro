"""wholesale_pricing

Revision ID: 37f7a3ed939f
Revises: 4c3d63b61f4f
Create Date: 2026-07-30 20:49:48.619579

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37f7a3ed939f'
down_revision: Union[str, Sequence[str], None] = '4c3d63b61f4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('customer_types', sa.Column('is_wholesale', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('products', sa.Column('wholesale_price', sa.Numeric(precision=12, scale=2), nullable=True))
    # Autogenerate no detecta CHECK constraints -- agregado a mano,
    # mismo criterio que ck_products_cost_positive (columna nullable,
    # NULL no viola el constraint, solo un valor <= 0 lo haría).
    op.create_check_constraint(
        'ck_products_wholesale_price_positive', 'products', 'wholesale_price > 0'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_products_wholesale_price_positive', 'products', type_='check')
    op.drop_column('products', 'wholesale_price')
    op.drop_column('customer_types', 'is_wholesale')
