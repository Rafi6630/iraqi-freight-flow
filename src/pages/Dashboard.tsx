import {
  LayoutDashboard, TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  ArrowLeftRight, Package, FileText, Receipt,
} from 'lucide-react';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_FX = 1310;

const stepLabels: Record<number, string> = {
  1: 'Setup', 2: 'Shipment', 3: 'Cost Sheet', 4: 'Quotation', 5: 'Approval',
  6: 'Execution', 7: 'Invoice', 8: 'Payment', 9: 'Closed',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading: ordersLoading } = useTableQuery<any>('orders');
  const { data: invoices = [] } = useTableQuery<any>('invoices');
  const { data: payments = [] } = useTableQuery<any>('payments');
  const { data: customers = [] } = useTableQuery<any>('customers');

  const metrics = useMemo(() => {
    const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
    const paidAR = invoices.reduce((s: number, i: any) => s + (i.paid_usd || 0), 0);
    const outstandingAR = totalRevenue - paidAR;
    const fxGainLoss = payments.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);
    const activeOrders = orders.filter((o: any) => o.status_step < 9).length;
    const overdueInvoices = invoices.filter((i: any) => i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date()).length;

    return {
      totalRevenue, outstandingAR, fxGainLoss, activeOrders, overdueInvoices,
      pendingQuotations: 0,
    };
  }, [orders, invoices, payments]);

  const metricCards = [
    { label: 'Total Revenue', usd: metrics.totalRevenue, icon: DollarSign },
    { label: 'Outstanding AR', usd: metrics.outstandingAR, icon: Receipt },
    { label: 'Active Orders', usd: null, count: metrics.activeOrders, icon: Package },
    { label: 'Overdue Invoices', usd: null, count: metrics.overdueInvoices, icon: AlertTriangle },
    { label: 'FX Gain/Loss MTD', usd: metrics.fxGainLoss, icon: ArrowLeftRight, isFx: true },
  ];

  const recentOrders = orders.slice(0, 10);

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />Dashboard
          </h1>
          <p className="erp-page-subtitle">Financial overview — All amounts in USD | IQD</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {metricCards.map((m) => (
          <div key={m.label} className="erp-metric-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{m.label}</span>
              <m.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            {ordersLoading ? <Skeleton className="h-8 w-full" /> : m.usd !== null && m.usd !== undefined ? (
              <CurrencyDisplay usd={m.usd} iqd={m.usd * DEFAULT_FX} size="md" layout="stacked" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{m.count}</p>
            )}
          </div>
        ))}
      </div>

      <div className="erp-table-container">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Order #</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Mode</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Step</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr><td colSpan={4} className="px-5 py-4"><Skeleton className="h-8 w-full" /></td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No orders yet. Create one from the Orders page.</td></tr>
              ) : recentOrders.map((o: any) => (
                <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                  <td className="px-5 py-3 font-mono font-medium text-primary">{o.order_no}</td>
                  <td className="px-5 py-3 text-muted-foreground">{o.origin_city || o.origin_country} → {o.destination_city || o.destination_country}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.mode} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`step-indicator text-xs ${o.status_step === 9 ? 'step-complete' : 'step-current'}`}>{o.status_step}</div>
                      <span className="text-xs text-muted-foreground">{stepLabels[o.status_step]}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
