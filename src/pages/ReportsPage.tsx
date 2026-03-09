import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_FX_RATE } from '@/lib/currency';
import { PerformanceReport } from '@/components/reports/PerformanceReport';
import { PartnerReport } from '@/components/reports/PartnerReport';
import { YearlyReport } from '@/components/reports/YearlyReport';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const reportTypes = [
  { id: 'profitability', name: 'Profitability', desc: 'Profit per order, customer, route, mode' },
  { id: 'ar-aging', name: 'AR Aging', desc: 'Current / 30 / 60 / 90+ day buckets by customer' },
  { id: 'ap-aging', name: 'AP Aging', desc: 'Current / 30 / 60 / 90+ day buckets by vendor' },
  { id: 'cash-flow', name: 'Cash Flow', desc: 'Inflows, outflows, net by period' },
  { id: 'fx-gain-loss', name: 'FX Gain/Loss', desc: 'Table + chart + totals' },
  { id: 'monthly-pl', name: 'Monthly P&L', desc: 'Revenue → Net Profit' },
  { id: 'partner', name: 'Partner Report', desc: 'Commission liability & profit share' },
  { id: 'performance', name: 'Performance', desc: 'Vendor & employee metrics' },
  { id: 'yearly', name: 'Yearly Report', desc: 'YoY comparison with charts' },
];

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(262, 83%, 58%)'];

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [selectedReport, setSelectedReport] = useState('profitability');

  const { data: invoices = [], isLoading: invLoading } = useTableQuery<any>('invoices');
  const { data: vendorBills = [] } = useTableQuery<any>('vendor_bills');
  const { data: payments = [] } = useTableQuery<any>('payments');
  const { data: orders = [] } = useTableQuery<any>('orders');
  const { data: expenses = [] } = useTableQuery<any>('expenses');
  const { data: orderCosts = [] } = useTableQuery<any>('order_costs');
  const { data: customers = [] } = useTableQuery<any>('customers');
  const { data: vendors = [] } = useTableQuery<any>('vendors');

  // Filter by date range
  const filterByDate = (items: any[], dateField: string) => {
    return items.filter(i => {
      const d = i[dateField];
      if (!d) return true;
      return d >= dateFrom && d <= dateTo;
    });
  };

  const filteredInvoices = filterByDate(invoices, 'issued_date');
  const filteredBills = filterByDate(vendorBills, 'issued_date');
  const filteredPayments = filterByDate(payments, 'date');
  const filteredExpenses = filterByDate(expenses, 'date');
  const filteredOrderCosts = filterByDate(orderCosts, 'created_at');

  // Profitability data — use order_costs (vendor costs) not vendorBills for COGS
  const profitData = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
    const totalCogs = filteredBills.reduce((s: number, b: any) => s + (b.amount_usd || 0), 0) ||
      filteredOrderCosts.filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive')
        .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
    const totalCommissions = filteredOrderCosts
      .filter((c: any) => c.category === 'partner_commission' || c.category === 'employee_incentive')
      .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
    const totalExpenses = filteredExpenses.reduce((s: number, e: any) => s + (e.amount_usd || 0), 0);
    // Payment fees — bank/transfer charges from all payments
    const totalPaymentFees = filteredPayments.reduce((s: number, p: any) => s + (p.payment_fee_usd || 0), 0);
    // FX Gain/Loss from payments
    const fxGainLoss = filteredPayments.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);
    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalCommissions - totalExpenses - totalPaymentFees + fxGainLoss;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    // Expense breakdown by category
    const expenseByCategory = filteredExpenses.reduce((acc: Record<string, number>, e: any) => {
      const cat = e.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + (e.amount_usd || 0);
      return acc;
    }, {} as Record<string, number>);
    return { totalRevenue, totalCogs, totalCommissions, totalExpenses, totalPaymentFees, fxGainLoss, grossProfit, netProfit, margin, expenseByCategory };
  }, [filteredInvoices, filteredBills, filteredOrderCosts, filteredExpenses, filteredPayments]);

  // AR Aging — only unpaid invoices in date range
  const arAging = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0 };
    filteredInvoices.filter((i: any) => i.status !== 'paid').forEach((i: any) => {
      const outstanding = (i.amount_usd || 0) - (i.paid_usd || 0);
      if (!i.due_date) { buckets.current += outstanding; return; }
      const days = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000);
      if (days <= 0) buckets.current += outstanding;
      else if (days <= 30) buckets.days30 += outstanding;
      else if (days <= 60) buckets.days60 += outstanding;
      else buckets.days90 += outstanding;
    });
    return [
      { bucket: 'Current', amount: buckets.current },
      { bucket: '1-30 Days', amount: buckets.days30 },
      { bucket: '31-60 Days', amount: buckets.days60 },
      { bucket: '90+ Days', amount: buckets.days90 },
    ];
  }, [filteredInvoices]);

  // AP Aging — only unpaid vendor bills in date range
  const apAging = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0 };
    filteredBills.filter((b: any) => b.status !== 'paid').forEach((b: any) => {
      const outstanding = (b.amount_usd || 0) - (b.paid_usd || 0);
      if (!b.due_date) { buckets.current += outstanding; return; }
      const days = Math.floor((now.getTime() - new Date(b.due_date).getTime()) / 86400000);
      if (days <= 0) buckets.current += outstanding;
      else if (days <= 30) buckets.days30 += outstanding;
      else if (days <= 60) buckets.days60 += outstanding;
      else buckets.days90 += outstanding;
    });
    return [
      { bucket: 'Current', amount: buckets.current },
      { bucket: '1-30 Days', amount: buckets.days30 },
      { bucket: '31-60 Days', amount: buckets.days60 },
      { bucket: '90+ Days', amount: buckets.days90 },
    ];
  }, [filteredBills]);

  // Cash Flow
  const cashFlow = useMemo(() => {
    const arPayments = filteredPayments.filter((p: any) => p.direction === 'AR');
    const apPayments = filteredPayments.filter((p: any) => p.direction === 'AP');
    const inflows = arPayments.reduce((s: number, p: any) => s + (p.amount_usd || 0), 0);
    const outflows = apPayments.reduce((s: number, p: any) => s + (p.amount_usd || 0), 0);
    return [
      { type: 'Inflows (AR)', amount: inflows },
      { type: 'Outflows (AP)', amount: outflows },
      { type: 'Net', amount: inflows - outflows },
    ];
  }, [filteredPayments]);

  // FX Gain/Loss
  const fxData = useMemo(() => {
    const totalGain = filteredPayments.filter((p: any) => (p.fx_gain_loss_usd || 0) > 0).reduce((s: number, p: any) => s + p.fx_gain_loss_usd, 0);
    const totalLoss = filteredPayments.filter((p: any) => (p.fx_gain_loss_usd || 0) < 0).reduce((s: number, p: any) => s + p.fx_gain_loss_usd, 0);
    return { totalGain, totalLoss, net: totalGain + totalLoss };
  }, [filteredPayments]);

  // Mode distribution
  const modeData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o: any) => { counts[o.mode] = (counts[o.mode] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [orders]);

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" />Reports</h1>
          <p className="erp-page-subtitle">All amounts computed using locked USD values</p>
        </div>
      </div>

      <div className="erp-metric-card flex items-end gap-4 flex-wrap">
        <div><Label className="text-xs">From Date</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-44" /></div>
        <div><Label className="text-xs">To Date</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-44" /></div>
        <Button size="sm">Apply Filter</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Report Selector */}
        <div className="erp-table-container p-0">
          <div className="px-4 py-3 border-b border-border bg-muted/50"><h3 className="text-sm font-semibold">Report Type</h3></div>
          <div className="divide-y divide-border">
            {reportTypes.map(r => (
              <button key={r.id} onClick={() => setSelectedReport(r.id)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors ${selectedReport === r.id ? 'bg-accent border-l-2 border-l-primary' : ''}`}>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="md:col-span-2 space-y-4">
          <div className="erp-metric-card">
            <h3 className="text-lg font-semibold mb-4">{reportTypes.find(r => r.id === selectedReport)?.name}</h3>

            {invLoading ? <Skeleton className="h-64 w-full" /> : (
              <>
                {/* Profitability */}
                {selectedReport === 'profitability' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Revenue', val: profitData.totalRevenue, color: 'text-green-600', icon: '💰' },
                        { label: 'Vendor Costs (COGS)', val: profitData.totalCogs, color: 'text-red-500', icon: '📦' },
                        { label: 'Gross Profit', val: profitData.grossProfit, color: profitData.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600', icon: '📊' },
                        { label: 'Commissions', val: profitData.totalCommissions, color: 'text-amber-600', icon: '🤝' },
                        { label: 'Expenses', val: profitData.totalExpenses, color: 'text-orange-600', icon: '🧾' },
                        { label: 'Payment Fees', val: profitData.totalPaymentFees, color: 'text-slate-600', icon: '🏦' },
                        { label: 'FX Gain / Loss', val: profitData.fxGainLoss, color: profitData.fxGainLoss >= 0 ? 'text-emerald-600' : 'text-red-500', icon: '💱' },
                        { label: 'Net Profit', val: profitData.netProfit, color: profitData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700', icon: '🏆' },
                      ].map(m => (
                        <div key={m.label} className={`p-4 rounded-lg ${m.label === 'Net Profit' || m.label === 'Gross Profit' ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-muted/50'}`}>
                          <p className="text-xs text-muted-foreground mb-1">{m.icon} {m.label}</p>
                          <p className={`text-lg font-bold font-mono ${m.color}`}>{m.val >= 0 ? '' : '-'}${Math.abs(m.val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-muted-foreground">{(m.val * DEFAULT_FX_RATE).toLocaleString()} IQD</p>
                        </div>
                      ))}
                    </div>
                    {modeData.length > 0 && (
                      <div className="h-64">
                        <p className="text-sm font-medium mb-2">Orders by Mode</p>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={modeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                              {modeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* AR Aging */}
                {selectedReport === 'ar-aging' && (
                  <div className="space-y-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={arAging}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="bucket" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {arAging.map(b => (
                        <div key={b.bucket} className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">{b.bucket}</p>
                          <p className="font-mono font-bold text-foreground">${b.amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AP Aging */}
                {selectedReport === 'ap-aging' && (
                  <div className="space-y-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={apAging}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="bucket" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Bar dataKey="amount" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Cash Flow */}
                {selectedReport === 'cash-flow' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {cashFlow.map(cf => (
                        <div key={cf.type} className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">{cf.type}</p>
                          <CurrencyDisplay usd={cf.amount} iqd={cf.amount * DEFAULT_FX_RATE} size="md" layout="stacked" />
                        </div>
                      ))}
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cashFlow}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="type" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {cashFlow.map((entry, i) => (
                              <Cell key={i} fill={entry.amount >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* FX Gain/Loss */}
                {selectedReport === 'fx-gain-loss' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Gain</p>
                        <p className="text-lg font-bold" style={{ color: 'hsl(142, 71%, 45%)' }}>+${fxData.totalGain.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Loss</p>
                        <p className="text-lg font-bold" style={{ color: 'hsl(0, 84%, 60%)' }}>${fxData.totalLoss.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Net FX</p>
                        <p className={`text-lg font-bold ${fxData.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>${fxData.net.toFixed(2)}</p>
                      </div>
                    </div>
                    {filteredPayments.filter((p: any) => p.fx_gain_loss_usd !== 0).length > 0 && (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={filteredPayments.filter((p: any) => p.fx_gain_loss_usd !== 0).map((p: any) => ({ date: p.date, gain_loss: p.fx_gain_loss_usd }))}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="gain_loss" stroke="hsl(var(--primary))" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* Monthly P&L */}
                {selectedReport === 'monthly-pl' && (() => {
                  // Build month-by-month rows for the selected year range
                  const monthRows: any[] = [];
                  const startYear  = parseInt(dateFrom.slice(0, 4));
                  const startMonth = parseInt(dateFrom.slice(5, 7));
                  const endYear    = parseInt(dateTo.slice(0, 4));
                  const endMonth   = parseInt(dateTo.slice(5, 7));

                  for (let y = startYear; y <= endYear; y++) {
                    const mStart = y === startYear ? startMonth : 1;
                    const mEnd   = y === endYear   ? endMonth   : 12;
                    for (let m = mStart; m <= mEnd; m++) {
                      const key = `${y}-${String(m).padStart(2, '0')}`;
                      const label = new Date(y, m - 1).toLocaleString('en', { month: 'short', year: '2-digit' });

                      const revenue     = invoices.filter((i: any) => (i.issued_date || '').startsWith(key))
                                            .reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
                      const cogs        = (vendorBills.filter((b: any) => (b.issued_date || '').startsWith(key))
                                            .reduce((s: number, b: any) => s + (b.amount_usd || 0), 0))
                                          || orderCosts.filter((c: any) =>
                                              (c.created_at || '').startsWith(key) &&
                                              c.category !== 'partner_commission' && c.category !== 'employee_incentive')
                                            .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
                      const commissions = orderCosts.filter((c: any) =>
                                            (c.created_at || '').startsWith(key) &&
                                            (c.category === 'partner_commission' || c.category === 'employee_incentive'))
                                            .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
                      // Expenses = entries from the expenses table (not order costs)
                      const expensesAmt = expenses.filter((e: any) => (e.date || '').startsWith(key))
                                            .reduce((s: number, e: any) => s + (e.amount_usd || 0), 0);
                      const payFees     = payments.filter((p: any) => (p.date || '').startsWith(key))
                                            .reduce((s: number, p: any) => s + (p.payment_fee_usd || 0), 0);
                      const fxGL        = payments.filter((p: any) => (p.date || '').startsWith(key))
                                            .reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);
                      const grossProfit = revenue - cogs;
                      const netProfit   = grossProfit - commissions - expensesAmt - payFees + fxGL;

                      // Only include months that have any activity
                      if (revenue || cogs || commissions || expensesAmt || payFees) {
                        monthRows.push({ key, label, revenue, cogs, grossProfit, commissions, expensesAmt, payFees, fxGL, netProfit });
                      }
                    }
                  }

                  // Period totals
                  const tot = monthRows.reduce((acc, r) => ({
                    revenue: acc.revenue + r.revenue, cogs: acc.cogs + r.cogs,
                    grossProfit: acc.grossProfit + r.grossProfit, commissions: acc.commissions + r.commissions,
                    expensesAmt: acc.expensesAmt + r.expensesAmt, payFees: acc.payFees + r.payFees,
                    fxGL: acc.fxGL + r.fxGL, netProfit: acc.netProfit + r.netProfit,
                  }), { revenue: 0, cogs: 0, grossProfit: 0, commissions: 0, expensesAmt: 0, payFees: 0, fxGL: 0, netProfit: 0 });

                  const fmtC = (n: number) => n === 0 ? '—'
                    : `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

                  // Expense detail for the selected period (from expenses table)
                  const expByCategory = filteredExpenses.reduce((acc: Record<string, number>, e: any) => {
                    const cat = e.category || 'Uncategorized';
                    acc[cat] = (acc[cat] || 0) + (e.amount_usd || 0);
                    return acc;
                  }, {} as Record<string, number>);

                  return (
                    <div className="space-y-4">
                      {monthRows.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No data for the selected period.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-muted/50">
                                <th className="text-left px-2 py-2 font-medium text-muted-foreground">Month</th>
                                <th className="text-right px-2 py-2 font-medium text-muted-foreground">💰 Revenue</th>
                                <th className="text-right px-2 py-2 font-medium text-muted-foreground">📦 COGS</th>
                                <th className="text-right px-2 py-2 font-medium text-muted-foreground">📊 Gross Profit</th>
                                <th className="text-right px-2 py-2 font-medium text-muted-foreground">🤝 Commissions</th>
                                <th className="text-right px-2 py-2 font-medium text-muted-foreground">🧾 Expenses</th>
                                <th className="text-right px-2 py-2 font-medium text-muted-foreground">🏦 Pay Fees</th>
                                <th className="text-right px-2 py-2 font-medium text-muted-foreground">💱 FX</th>
                                <th className="text-right px-2 py-2 font-medium text-muted-foreground">🏆 Net Profit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthRows.map(r => (
                                <tr key={r.key} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                  <td className="px-2 py-2 font-semibold">{r.label}</td>
                                  <td className="px-2 py-2 text-right text-emerald-600 font-mono">{fmtC(r.revenue)}</td>
                                  <td className="px-2 py-2 text-right text-red-500 font-mono">{r.cogs > 0 ? `-${fmtC(r.cogs).slice(1)}` : '—'}</td>
                                  <td className={`px-2 py-2 text-right font-mono font-semibold ${r.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtC(r.grossProfit)}</td>
                                  <td className="px-2 py-2 text-right text-amber-600 font-mono">{r.commissions > 0 ? `-${fmtC(r.commissions).slice(1)}` : '—'}</td>
                                  <td className="px-2 py-2 text-right text-orange-600 font-mono">{r.expensesAmt > 0 ? `-${fmtC(r.expensesAmt).slice(1)}` : '—'}</td>
                                  <td className="px-2 py-2 text-right text-slate-500 font-mono">{r.payFees > 0 ? `-${fmtC(r.payFees).slice(1)}` : '—'}</td>
                                  <td className={`px-2 py-2 text-right font-mono ${r.fxGL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{r.fxGL !== 0 ? `${r.fxGL > 0 ? '+' : ''}${fmtC(r.fxGL)}` : '—'}</td>
                                  <td className={`px-2 py-2 text-right font-mono font-bold ${r.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmtC(r.netProfit)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-border bg-muted/50 font-bold">
                                <td className="px-2 py-2 text-sm">TOTAL</td>
                                <td className="px-2 py-2 text-right text-emerald-600 font-mono">{fmtC(tot.revenue)}</td>
                                <td className="px-2 py-2 text-right text-red-500 font-mono">{tot.cogs > 0 ? `-${fmtC(tot.cogs).slice(1)}` : '—'}</td>
                                <td className={`px-2 py-2 text-right font-mono ${tot.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtC(tot.grossProfit)}</td>
                                <td className="px-2 py-2 text-right text-amber-600 font-mono">{tot.commissions > 0 ? `-${fmtC(tot.commissions).slice(1)}` : '—'}</td>
                                <td className="px-2 py-2 text-right text-orange-600 font-mono">{tot.expensesAmt > 0 ? `-${fmtC(tot.expensesAmt).slice(1)}` : '—'}</td>
                                <td className="px-2 py-2 text-right text-slate-500 font-mono">{tot.payFees > 0 ? `-${fmtC(tot.payFees).slice(1)}` : '—'}</td>
                                <td className={`px-2 py-2 text-right font-mono ${tot.fxGL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{tot.fxGL !== 0 ? `${tot.fxGL > 0 ? '+' : ''}${fmtC(tot.fxGL)}` : '—'}</td>
                                <td className={`px-2 py-2 text-right font-mono ${tot.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmtC(tot.netProfit)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {/* Expense detail breakdown */}
                      {Object.keys(expByCategory).length > 0 && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2 uppercase tracking-wide">🧾 Expenses Breakdown by Category</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(expByCategory).map(([cat, amt]: any) => (
                              <div key={cat} className="flex justify-between items-center text-sm bg-white dark:bg-card rounded px-2 py-1">
                                <span className="text-muted-foreground truncate mr-2">{cat}</span>
                                <span className="font-mono text-orange-600 whitespace-nowrap">${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-muted/20 rounded-lg border border-border text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Period: {dateFrom} → {dateTo} · Net Margin: <span className={`font-bold ${profitData.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{profitData.margin.toFixed(1)}%</span></p>
                        <p>Net Profit = Revenue − COGS − Commissions − Expenses − Payment Fees ± FX Gain/Loss</p>
                        <p className="mt-0.5 text-orange-600">🧾 Expenses = entries from the Expenses page (rent, salaries, utilities, etc.)</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Placeholder for other reports */}
                {selectedReport === 'performance' && (
                  <PerformanceReport dateFrom={dateFrom} dateTo={dateTo} />
                )}

                {selectedReport === 'partner' && (
                  <PartnerReport dateFrom={dateFrom} dateTo={dateTo} />
                )}

                {selectedReport === 'yearly' && (
                  <YearlyReport dateFrom={dateFrom} dateTo={dateTo} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
