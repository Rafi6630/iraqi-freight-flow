import {
  LayoutDashboard, TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Package, FileText, Receipt, CheckCircle2, Clock, BarChart2, CreditCard,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { DEFAULT_FX_RATE } from '@/lib/currency';

const DEFAULT_FX = DEFAULT_FX_RATE;

const stepLabels: Record<number, string> = {
  1: 'Setup', 2: 'Shipment', 3: 'Cost Sheet', 4: 'Quotation', 5: 'Approval',
  6: 'Execution', 7: 'Invoice', 8: 'Payment', 9: 'Closed',
};

function MetricCard({ label, value, subValue, icon: Icon, color = 'text-foreground', loading }: any) {
  return (
    <div className="erp-metric-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      {loading ? <Skeleton className="h-8 w-full" /> : (
        <>
          <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
          {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading: ordersLoading } = useTableQuery<any>('orders');
  const { data: invoices = [] } = useTableQuery<any>('invoices');
  const { data: vendorBills = [] } = useTableQuery<any>('vendor_bills');
  const { data: payments = [] } = useTableQuery<any>('payments');
  const { data: orderCosts = [] } = useTableQuery<any>('order_costs');
  const { data: expenses = [] } = useTableQuery<any>('expenses');
  const { data: customers = [] } = useTableQuery<any>('customers');

  const loading = ordersLoading;

  const metrics = useMemo(() => {
    const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
    const paidAR = invoices.reduce((s: number, i: any) => s + (i.paid_usd || 0), 0);
    const outstandingAR = totalRevenue - paidAR;

    const totalAP = vendorBills.reduce((s: number, b: any) => s + (b.amount_usd || 0), 0);
    const paidAP = vendorBills.reduce((s: number, b: any) => s + (b.paid_usd || 0), 0);
    const outstandingAP = totalAP - paidAP;

    const totalCosts = orderCosts
      .filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive')
      .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
    const totalCommissions = orderCosts
      .filter((c: any) => c.category === 'partner_commission' || c.category === 'employee_incentive')
      .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount_usd || 0), 0);
    const totalPaymentFees = payments.reduce((s: number, p: any) => s + (p.payment_fee_usd || 0), 0);
    const fxGainLoss = payments.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);

    const grossProfit = totalRevenue - totalCosts;
    const netProfit = grossProfit - totalCommissions - totalExpenses - totalPaymentFees + fxGainLoss;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const activeOrders = orders.filter((o: any) => o.status_step < 9).length;
    const closedOrders = orders.filter((o: any) => o.status_step >= 9 && o.closed_at).length;
    const overdueInvoices = invoices.filter((i: any) => i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date()).length;
    const overdueBills = vendorBills.filter((b: any) => b.status !== 'paid' && b.due_date && new Date(b.due_date) < new Date()).length;

    return {
      totalRevenue, outstandingAR, totalAP, outstandingAP,
      totalCosts, totalCommissions, totalExpenses, totalPaymentFees, fxGainLoss,
      grossProfit, netProfit, margin,
      activeOrders, closedOrders, totalOrders: orders.length,
      overdueInvoices, overdueBills,
    };
  }, [orders, invoices, vendorBills, payments, orderCosts, expenses]);

  const monthlyChart = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months: Record<string, { month: string; Revenue: number; Costs: number; Profit: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${currentYear}-${String(m).padStart(2, '0')}`;
      months[key] = { month: new Date(currentYear, m - 1).toLocaleString('en', { month: 'short' }), Revenue: 0, Costs: 0, Profit: 0 };
    }
    invoices.forEach((inv: any) => {
      const key = (inv.issued_date || '').substring(0, 7);
      if (months[key]) months[key].Revenue += inv.amount_usd || 0;
    });
    orderCosts.forEach((c: any) => {
      const key = (c.created_at || '').substring(0, 7);
      if (months[key] && c.category !== 'partner_commission' && c.category !== 'employee_incentive')
        months[key].Costs += c.amount_usd || 0;
    });
    return Object.values(months).map(m => ({ ...m, Profit: Math.round((m.Revenue - m.Costs) * 100) / 100 }));
  }, [invoices, orderCosts]);

  const recentOrders = useMemo(() =>
    [...orders].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 8),
    [orders]);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtIqd = (n: number) => `${(n * DEFAULT_FX).toLocaleString(undefined, { maximumFractionDigits: 0 })} IQD`;

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />Dashboard
          </h1>
          <p className="erp-page-subtitle">Financial overview — All amounts in USD</p>
        </div>
      </div>

      {/* Row 1 — Revenue & Profit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard loading={loading} label="Total Revenue" icon={DollarSign}
          value={fmt(metrics.totalRevenue)} subValue={fmtIqd(metrics.totalRevenue)} color="text-emerald-600" />
        <MetricCard loading={loading} label="Total Costs (COGS)" icon={TrendingDown}
          value={fmt(metrics.totalCosts)} subValue={fmtIqd(metrics.totalCosts)} color="text-red-500" />
        <MetricCard loading={loading} label="Gross Profit" icon={TrendingUp}
          value={fmt(metrics.grossProfit)} subValue={fmtIqd(metrics.grossProfit)}
          color={metrics.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <MetricCard loading={loading} label="Net Profit" icon={BarChart2}
          value={fmt(metrics.netProfit)}
          subValue={`Margin ${metrics.margin.toFixed(1)}% · ${fmtIqd(metrics.netProfit)}`}
          color={metrics.netProfit >= 0 ? 'text-primary' : 'text-destructive'} />
      </div>

      {/* Row 2 — AR / AP / Fees / FX */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard loading={loading} label="Outstanding AR" icon={Receipt}
          value={fmt(metrics.outstandingAR)} subValue={`of ${fmt(metrics.totalRevenue)} billed`} color="text-amber-600" />
        <MetricCard loading={loading} label="Outstanding AP" icon={FileText}
          value={fmt(metrics.outstandingAP)} subValue={`of ${fmt(metrics.totalAP)} billed`} color="text-orange-600" />
        <MetricCard loading={loading} label="Payment Fees" icon={CreditCard}
          value={fmt(metrics.totalPaymentFees)} subValue="Bank / transfer fees" color="text-slate-600" />
        <MetricCard loading={loading} label="FX Gain / Loss" icon={TrendingUp}
          value={`${metrics.fxGainLoss >= 0 ? '+' : ''}${fmt(metrics.fxGainLoss)}`}
          subValue="Exchange rate impact"
          color={metrics.fxGainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'} />
      </div>

      {/* Row 3 — Cost breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard loading={loading} label="Commissions" icon={DollarSign}
          value={fmt(metrics.totalCommissions)} subValue="Partner & employee" color="text-amber-600" />
        <MetricCard loading={loading} label="Operating Expenses" icon={TrendingDown}
          value={fmt(metrics.totalExpenses)} subValue="All categories" color="text-orange-600" />
        <MetricCard loading={loading} label="Total Deductions" icon={TrendingDown}
          value={fmt(metrics.totalCommissions + metrics.totalExpenses + metrics.totalPaymentFees)}
          subValue="Commissions + Expenses + Fees" color="text-red-500" />
        <div className="erp-metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Margin</span>
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>
          {loading ? <Skeleton className="h-8 w-full" /> : (
            <div className="space-y-2">
              <p className={`text-2xl font-bold font-mono ${metrics.margin >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {metrics.margin.toFixed(1)}%
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${metrics.margin >= 20 ? 'bg-emerald-500' : metrics.margin >= 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.max(metrics.margin, 0), 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 4 — P&L Waterfall */}
      {!loading && (
        <div className="erp-metric-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> P&L Summary
          </h3>
          <div className="space-y-1.5">
            {[
              { label: '💰 Revenue', val: metrics.totalRevenue, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: '  − Vendor Costs (COGS)', val: -metrics.totalCosts, color: 'text-red-500', bg: 'bg-muted/30' },
              { label: '= Gross Profit', val: metrics.grossProfit, color: metrics.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: 'bg-primary/10 font-bold' },
              { label: '  − Commissions', val: -metrics.totalCommissions, color: 'text-amber-600', bg: 'bg-muted/30' },
              { label: '  − Expenses', val: -metrics.totalExpenses, color: 'text-orange-600', bg: 'bg-muted/30' },
              { label: '  − Payment Fees', val: -metrics.totalPaymentFees, color: 'text-slate-600', bg: 'bg-muted/30' },
              { label: '  +/− FX Gain/Loss', val: metrics.fxGainLoss, color: metrics.fxGainLoss >= 0 ? 'text-emerald-600' : 'text-red-500', bg: 'bg-muted/30' },
              { label: '= Net Profit', val: metrics.netProfit, color: metrics.netProfit >= 0 ? 'text-primary' : 'text-destructive', bg: 'bg-primary/10 font-bold' },
            ].map(row => (
              <div key={row.label} className={`flex justify-between items-center px-4 py-2 rounded-lg text-sm ${row.bg}`}>
                <span className={row.bg.includes('font-bold') ? 'font-bold' : 'text-muted-foreground'}>{row.label}</span>
                <div className="text-right">
                  <span className={`font-mono font-semibold ${row.color}`}>
                    {row.val >= 0 ? '+' : ''}{fmt(row.val)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">{fmtIqd(row.val)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 5 — Order counts + Overdue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard loading={loading} label="Total Orders" icon={Package}
          value={metrics.totalOrders} subValue="All time" />
        <MetricCard loading={loading} label="Active Orders" icon={Clock}
          value={metrics.activeOrders} subValue="In progress" color="text-blue-600" />
        <MetricCard loading={loading} label="Closed Orders" icon={CheckCircle2}
          value={metrics.closedOrders} subValue="Completed" color="text-emerald-600" />
        <div className="erp-metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue Alerts</span>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </div>
          {loading ? <Skeleton className="h-8 w-full" /> : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Invoices overdue</span>
                <span className={`text-xl font-bold ${metrics.overdueInvoices > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{metrics.overdueInvoices}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Bills overdue</span>
                <span className={`text-xl font-bold ${metrics.overdueBills > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{metrics.overdueBills}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="erp-metric-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          Monthly Revenue vs Costs ({new Date().getFullYear()})
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Costs" fill="hsl(0, 84%, 60%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Profit" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="erp-table-container">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Orders</h3>
          <span className="text-xs text-muted-foreground">{orders.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Order #</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Mode</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Costs</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Profit</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Step</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-4"><Skeleton className="h-8 w-full" /></td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">No orders yet. Create one from the Orders page.</td></tr>
              ) : recentOrders.map((o: any) => {
                const customer = customers.find((c: any) => c.id === o.customer_id);
                const orderRevenue = invoices.filter((i: any) => i.order_id === o.id).reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
                const orderCostsAmt = orderCosts.filter((c: any) => c.order_id === o.id && c.category !== 'partner_commission' && c.category !== 'employee_incentive').reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
                const orderProfit = orderRevenue - orderCostsAmt;
                return (
                  <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td className="px-5 py-3 font-mono font-medium text-primary">{o.order_no}</td>
                    <td className="px-5 py-3 text-sm">{customer?.company || customer?.name || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {[o.origin_city, o.origin_country].filter(Boolean).join(', ')} → {[o.destination_city, o.destination_country].filter(Boolean).join(', ')}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={o.mode} /></td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-emerald-600">{orderRevenue > 0 ? fmt(orderRevenue) : '—'}</td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-red-500">{orderCostsAmt > 0 ? fmt(orderCostsAmt) : '—'}</td>
                    <td className="px-5 py-3 text-right font-mono text-sm">
                      {orderRevenue > 0 ? (
                        <span className={orderProfit >= 0 ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>{fmt(orderProfit)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`step-indicator text-xs ${o.status_step === 9 ? 'step-complete' : 'step-current'}`}>{o.status_step}</div>
                        <span className="text-xs text-muted-foreground">{stepLabels[o.status_step]}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
