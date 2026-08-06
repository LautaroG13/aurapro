"use client";

import { useQuery } from "@tanstack/react-query";

import { getDashboardSummary, getPaymentMethodTotals, getRevenueTimeseries, getTopProducts } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/paymentMethods";
import { Card, StatCard } from "@/components/ui";

import { RankedBarList } from "./RankedBarList";
import { RevenueChart } from "./RevenueChart";

export function Dashboard() {
  const summaryQuery = useQuery({ queryKey: ["dashboard", "summary"], queryFn: getDashboardSummary });
  const revenueQuery = useQuery({
    queryKey: ["dashboard", "revenue-timeseries"],
    queryFn: () => getRevenueTimeseries(14),
  });
  const topProductsQuery = useQuery({ queryKey: ["dashboard", "top-products"], queryFn: () => getTopProducts(5) });
  const paymentMethodsQuery = useQuery({ queryKey: ["dashboard", "payment-methods"], queryFn: getPaymentMethodTotals });

  const summary = summaryQuery.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Ingresos hoy" value={summary ? formatCurrency(summary.revenue_today) : "···"} />
        <StatCard label="Ingresos del mes" value={summary ? formatCurrency(summary.revenue_month) : "···"} />
        <StatCard label="Ventas hoy" value={summary ? summary.sales_today_count : "···"} />
        <StatCard label="Ticket promedio" value={summary ? formatCurrency(summary.average_ticket_month) : "···"} />
        <StatCard
          label="Deuda de clientes"
          value={summary ? formatCurrency(summary.customer_debt_total) : "···"}
          deltaDirection={summary && summary.customer_debt_total > 0 ? "down" : "neutral"}
        />
        <StatCard
          label="Alertas de stock"
          value={summary ? summary.low_stock_count : "···"}
          deltaDirection={summary && summary.low_stock_count > 0 ? "down" : "up"}
        />
      </div>

      <Card className="p-5">
        <h2 className="mb-1">Ingresos — últimos 14 días</h2>
        {revenueQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-text-faint">Cargando...</p>
        ) : (
          <RevenueChart data={revenueQuery.data ?? []} />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3">Top productos (30 días)</h2>
          {topProductsQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-text-faint">Cargando...</p>
          ) : (
            <RankedBarList
              items={(topProductsQuery.data ?? []).map((item) => ({
                key: item.product_id,
                label: item.product_name,
                value: item.revenue,
              }))}
              emptyLabel="Sin ventas en los últimos 30 días."
            />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3">Ventas por medio de pago (30 días)</h2>
          {paymentMethodsQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-text-faint">Cargando...</p>
          ) : (
            <RankedBarList
              items={(paymentMethodsQuery.data ?? []).map((item) => ({
                key: item.payment_method,
                label: paymentMethodLabel(item.payment_method),
                value: item.total,
              }))}
              emptyLabel="Sin ventas en los últimos 30 días."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
