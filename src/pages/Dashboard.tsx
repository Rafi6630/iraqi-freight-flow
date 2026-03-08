import {
  LayoutDashboard, TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  ArrowLeftRight, Package, FileText, Receipt,
} from 'lucide-react';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { mockDashboardMetrics, mockOrders } from '@/lib/mock-data';

const m = mockDashboardMetrics;

const metrics = [
  { label: 'Total Revenue', usd: m.totalRevenue.usd, iqd: m.totalRevenue.iqd, icon: DollarSign, trend: '+12.5%', up: true },
  { label: 'Outstanding AR', usd: m.outstandingAR.usd, iqd: m.outstandingAR.iqd, icon: Receipt, trend: '-3.2%', up: false },
  { label: 'Operational Profit', usd: m.operationalProfit.usd, iqd: m.operationalProfit.iqd, icon: TrendingUp, trend: '+8.7%', up: true },
  { label: 'Financial Exposure', usd: m.financialExposure.usd, iqd: m.financialExposure.iqd, icon: AlertTriangle, trend: '+2.1%', up: true },
  { label: 'FX Gain/Loss MTD', usd: m.fxGainLossMTD.usd, iqd: m.fxGainLossMTD.iqd, icon: ArrowLeftRight, trend: '', up: m.fxGainLossMTD.usd >= 0 },
];

const quickStats = [
  { label: 'Active Orders', value: m.activeOrders, icon: Package },
  { label: 'Pending Quotations', value: m.pendingQuotations, icon: FileText },
  { label: 'Overdue Invoices', value: m.overdueInvoices, icon: Receipt },
];

const stepLabels: Record<number, string> = {
  1: 'Setup', 2: 'Shipment', 3: 'Cost Sheet', 4: 'Quotation', 5: 'Approval',
  6: 'Execution', 7: 'Invoice', 8: 'Payment', 9: 'Closed',
};

export default function Dashboard() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Dashboard
          </h1>
          <p className="erp-page-subtitle">Financial overview — All amounts in USD | IQD</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="erp-metric-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{m.label}</span>
              <m.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <CurrencyDisplay usd={m.usd} iqd={m.iqd} size="md" layout="stacked" />
            {m.trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${m.up ? 'fx-gain' : 'fx-loss'}`}>
                {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {m.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {quickStats.map((s) => (
          <div key={s.label} className="erp-metric-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <s.icon className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="erp-table-container">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Order #</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Mode</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Step</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((o) => (
                <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-primary">{o.order_no}</td>
                  <td className="px-5 py-3">{o.customer}</td>
                  <td className="px-5 py-3 text-muted-foreground">{o.origin} → {o.destination}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.mode} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`step-indicator text-xs ${o.status_step === 9 ? 'step-complete' : 'step-current'}`}>
                        {o.status_step}
                      </div>
                      <span className="text-xs text-muted-foreground">{stepLabels[o.status_step]}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {o.revenue_usd > 0 ? (
                      <CurrencyDisplay usd={o.revenue_usd} iqd={o.revenue_usd * 1310} size="sm" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
