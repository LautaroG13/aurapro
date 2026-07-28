"""Comprobante de venta en PDF -- no es una factura fiscal (no hay
integración con AFIP/ARCA todavía), es un recibo interno para
entregarle al cliente o archivar. Se genera on-demand en el endpoint
GET /sales/{id}/receipt, no se persiste el PDF en ningún lado.
"""

from fpdf import FPDF

from app.modules.sales.models import Sale
from app.shared.payment_methods import is_card_payment, payment_method_label


def build_sale_receipt_pdf(sale: Sale, tenant_name: str, customer_name: str) -> bytes:
    pdf = FPDF(format="A5")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, tenant_name, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, "Comprobante de venta", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Venta N° {sale.sale_number:06d}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Fecha: {sale.created_at.strftime('%d/%m/%Y %H:%M')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Cliente: {customer_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    col_widths = (85, 20, 30, 30)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(col_widths[0], 7, "Producto", border="B")
    pdf.cell(col_widths[1], 7, "Cant.", border="B", align="R")
    pdf.cell(col_widths[2], 7, "P. unit.", border="B", align="R")
    pdf.cell(col_widths[3], 7, "Subtotal", border="B", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    for item in sale.items:
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
    pdf.cell(0, 8, f"Total: ${float(sale.total_amount):.2f}", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Medio de pago: {payment_method_label(sale.payment_method)}", new_x="LMARGIN", new_y="NEXT")
    if is_card_payment(sale.payment_method):
        if sale.card_coupon_number:
            pdf.cell(0, 6, f"Cupón: {sale.card_coupon_number}", new_x="LMARGIN", new_y="NEXT")
        if sale.card_authorization_code:
            pdf.cell(0, 6, f"Autorización: {sale.card_authorization_code}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(0, 5, "Este comprobante es un recibo interno, no reemplaza una factura fiscal.")

    return bytes(pdf.output())
