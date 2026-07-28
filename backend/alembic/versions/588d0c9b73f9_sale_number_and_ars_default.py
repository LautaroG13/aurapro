"""sale_number_and_ars_default

Revision ID: 588d0c9b73f9
Revises: ec766b2ffbd4
Create Date: 2026-07-27 21:28:35.499155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '588d0c9b73f9'
down_revision: Union[str, Sequence[str], None] = 'ec766b2ffbd4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # tenants.next_sale_number: server_default='1' alcanza para tenants
    # nuevos y para los que todavía no tienen ventas -- se corrige más
    # abajo para los que ya tienen.
    op.add_column('tenants', sa.Column('next_sale_number', sa.Integer(), server_default='1', nullable=False))

    # sale_number entra nullable primero -- las ventas ya existentes
    # (datos reales de prueba en el tenant AuraPro Admin) no tienen
    # valor todavía, se completa con el backfill de abajo antes de
    # poner NOT NULL.
    op.add_column('sales', sa.Column('sale_number', sa.Integer(), nullable=True))

    # Backfill: un correlativo 1..N por tenant, ordenado por fecha de
    # creación -- así las ventas viejas quedan numeradas en el mismo
    # orden en que se hicieron, sin inventar un orden arbitrario.
    op.execute(
        """
        UPDATE sales
        SET sale_number = sub.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS rn
            FROM sales
        ) AS sub
        WHERE sales.id = sub.id
        """
    )

    op.alter_column('sales', 'sale_number', nullable=False)
    op.create_unique_constraint('uq_sales_tenant_id_sale_number', 'sales', ['tenant_id', 'sale_number'])

    # Deja el contador de cada tenant en (última venta numerada + 1) --
    # sin esto, la próxima venta de un tenant con historial pisaría un
    # sale_number ya usado (el default '1' de arriba solo sirve para
    # tenants sin ventas todavía).
    op.execute(
        """
        UPDATE tenants
        SET next_sale_number = sub.max_num + 1
        FROM (
            SELECT tenant_id, MAX(sale_number) AS max_num
            FROM sales
            GROUP BY tenant_id
        ) AS sub
        WHERE tenants.id = sub.tenant_id
        """
    )

    # Moneda: el default pasa de USD a ARS (AuraPro es para negocios
    # argentinos). Las ventas de prueba ya existentes también se
    # normalizan -- no hay ventas reales en producción todavía como
    # para preocuparse por reescribir historial financiero real.
    op.alter_column('sales', 'currency', server_default='ARS')
    op.execute("UPDATE sales SET currency = 'ARS' WHERE currency = 'USD'")


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('sales', 'currency', server_default='USD')
    op.drop_constraint('uq_sales_tenant_id_sale_number', 'sales', type_='unique')
    op.drop_column('sales', 'sale_number')
    op.drop_column('tenants', 'next_sale_number')
