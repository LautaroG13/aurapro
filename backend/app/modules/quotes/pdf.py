"""Comprobante de presupuesto en PDF -- mismo criterio que
sales/pdf.py (fpdf2, se genera on-demand, no se persiste). No es una
venta: no lleva medio de pago ni cupón/autorización, sí "válido hasta"
si se cargó."""

from io import BytesIO

from fpdf import FPDF

from app.modules.identity.models import Tenant
from app.modules.quotes.models import Quote, QuoteStatus

STATUS_LABELS: dict[QuoteStatus, str] = {
    QuoteStatus.PENDING: "Pendiente",
    QuoteStatus.ACCEPTED: "Aceptado",
    QuoteStatus.REJECTED: "Rechazado",
    QuoteStatus.EXPIRED: "Vencido",
}


def build_quote_pdf(quote: Quote, tenant: Tenant, customer_name: str) -> bytes:
    pdf = FPDF(format="A5")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    if tenant.logo is not None:
        pdf.image(BytesIO(tenant.logo), x=pdf.w - 35, y=8, w=25)

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, tenant.name, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    if tenant.cuit:
        pdf.cell(0, 5, f"CUIT: {tenant.cuit}", new_x="LMARGIN", new_y="NEXT")
    if tenant.address:
        pdf.cell(0, 5, tenant.address, new_x="LMARGIN", new_y="NEXT")
    if tenant.phone or tenant.business_email:
        contact = " - ".join(filter(None, [tenant.phone, tenant.business_email]))
        pdf.cell(0, 5, contact, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, "Presupuesto", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"N° {quote.quote_number:06d}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Fecha: {quote.created_at.strftime('%d/%m/%Y %H:%M')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Cliente: {customer_name}", new_x="LMARGIN", new_y="NEXT")
    if quote.valid_until is not None:
        pdf.cell(0, 6, f"Válido hasta: {quote.valid_until.strftime('%d/%m/%Y')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    col_widths = (85, 20, 30, 30)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(col_widths[0], 7, "Producto", border="B")
    pdf.cell(col_widths[1], 7, "Cant.", border="B", align="R")
    pdf.cell(col_widths[2], 7, "P. unit.", border="B", align="R")
    pdf.cell(col_widths[3], 7, "Subtotal", border="B", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    for item in quote.items:
        label = item.product.name
        if item.variant is not None:
            label += " (" + ", ".join(item.variant.attributes.values()) + ")"
        subtotal = item.quantity * float(item.unit_price)
        pdf.cell(col_widths[0], 7, label[:48])
        pdf.cell(col_widths[1], 7, str(item.quantity), align="R")
        pdf.cell(col_widths[2], 7, f"${float(item.unit_price):.2f}", align="R")
        pdf.cell(col_widths[3], 7, f"${subtotal:.2f}", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"Total: ${float(quote.total_amount):.2f}", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Estado: {STATUS_LABELS.get(quote.status, quote.status.value)}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(0, 5, "Este documento es un presupuesto, no una factura ni un comprobante de venta.")

    return bytes(pdf.output())
