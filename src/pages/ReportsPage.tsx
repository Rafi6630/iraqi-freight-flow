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
  const [dateFrom, setDateFrom] = useState('2024-04-01');
  const [dateTo, setDateTo] = useState('2024-04-30');
  const [selectedReport, setSelectedReport] = useState('profitability');

  const { data: invoices = [], isLoading: invLoading } = useTableQuery<any>('invoices');
  const { data: vendorBills = [] } = useTableQuery<any>('vendor_bills');
  const { data: payments = [] } = useTableQuery<any>('payments');
  const { data: orders = [] } = useTableQuery<any>('orders');
  const { data: expenses = [] } = useTableQuery<any>('expenses');
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
  const filteredPayments = filterByDate(payments, 'date');
  const filteredExpenses = filterByDate(expenses, 'date');

  // Profitability data
  const profitData = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
    const totalCosts = vendorBills.reduce((s: number, b: any) => s + (b.amount_usd || 0), 0);
    const totalExpenses = filteredExpenses.reduce((s: number, e: any) => s + (e.amount_usd || 0), 0);
    const netProfit = totalRevenue - totalCosts - totalExpenses;
    return { totalRevenue, totalCosts, totalExpenses, netProfit };
  }, [filteredInvoices, vendorBills, filteredExpenses]);

  // AR Aging
  const arAging = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0 };
    invoices.filter((i: any) => i.status !== 'paid').forEach((i: any) => {
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
  }, [invoices]);

  // AP Aging
  const apAging = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0 };
    vendorBills.filter((b: any) => b.status !== 'paid').forEach((b: any) => {
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
  }, [vendorBills]);

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
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Revenue', val: profitData.totalRevenue },
                        { label: 'Costs', val: profitData.totalCosts },
                        { label: 'Expenses', val: profitData.totalExpenses },
                        { label: 'Net Profit', val: profitData.netProfit },
                      ].map(m => (
                        <div key={m.label} className="p-4 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                          <CurrencyDisplay usd={m.val} iqd={m.val * DEFAULT_FX_RATE} size="md" layout="stacked" />
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
                {selectedReport === 'monthly-pl' && (
                  <div className="space-y-2">
                    {[
                      { label: 'Revenue', val: profitData.totalRevenue },
                      { label: '(-) COGS / Vendor Costs', val: -profitData.totalCosts },
                      { label: '= Gross Profit', val: profitData.totalRevenue - profitData.totalCosts },
                      { label: '(-) Operating Expenses', val: -profitData.totalExpenses },
                      { label: '(+/-) FX Gain/Loss', val: fxData.net },
                      { label: '= Net Profit', val: profitData.netProfit + fxData.net },
                    ].map(row => (
                      <div key={row.label} className={`flex justify-between items-center p-3 rounded-lg ${row.label.startsWith('=') ? 'bg-primary/10 font-bold' : 'bg-muted/30'}`}>
                        <span className="text-sm">{row.label}</span>
                        <CurrencyDisplay usd={row.val} iqd={row.val * DEFAULT_FX_RATE} size="sm" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Placeholder for other reports */}
                {['partner', 'performance', 'yearly'].includes(selectedReport) && (
                  <p className="text-muted-foreground py-8 text-center">Add data to generate this report. Create orders, invoices, and payments to see metrics here.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
