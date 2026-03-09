import { useMemo } from 'react';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { DEFAULT_FX_RATE } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Props { dateFrom: string; dateTo: string; }

export function YearlyReport({ dateFrom, dateTo }: Props) {
  const { data: invoices = [],    isLoading } = useTableQuery<any>('invoices');
  const { data: vendorBills = [] }            = useTableQuery<any>('vendor_bills');
  const { data: expenses = [] }               = useTableQuery<any>('expenses');
  const { data: orders = [] }                 = useTableQuery<any>('orders');
  const { data: orderCosts = [] }             = useTableQuery<any>('order_costs');
  const { data: payments = [] }               = useTableQuery<any>('payments');

  const yearlyData = useMemo(() => {
    // Collect all years present in the data
    const years = new Set<string>();
    invoices.forEach((i: any)    => { if (i.issued_date)  years.add(i.issued_date.slice(0, 4)); });
    vendorBills.forEach((b: any) => { if (b.issued_date)  years.add(b.issued_date.slice(0, 4)); });
    orders.forEach((o: any)      => { if (o.created_at)   years.add(o.created_at.slice(0, 4)); });
    expenses.forEach((e: any)    => { if (e.date)         years.add(e.date.slice(0, 4)); });

    return [...years].sort().map(year => {
      const yInv      = invoices.filter((i: any)    => i.issued_date?.startsWith(year));
      const yBills    = vendorBills.filter((b: any) => b.issued_date?.startsWith(year));
      const yExp      = expenses.filter((e: any)    => e.date?.startsWith(year));
      const yOrders   = orders.filter((o: any)      => o.created_at?.startsWith(year));
      const yCosts    = orderCosts.filter((c: any)  => (c.created_at || '').startsWith(year));
      const yPay      = payments.filter((p: any)    => (p.date || '').startsWith(year));

      const revenue      = yInv.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);

      // COGS: use vendor bills if they exist, fall back to order_costs (vendor only)
      const billsCogs    = yBills.reduce((s: number, b: any) => s + (b.amount_usd || 0), 0);
      const costsCogs    = yCosts
        .filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive')
        .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
      const cogs         = billsCogs || costsCogs;

      const grossProfit  = revenue - cogs;

      const commissions  = yCosts
        .filter((c: any) => c.category === 'partner_commission' || c.category === 'employee_incentive')
        .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);

      const expensesAmt  = yExp.reduce((s: number, e: any) => s + (e.amount_usd || 0), 0);

      const paymentFees  = yPay.reduce((s: number, p: any) => s + (p.payment_fee_usd || 0), 0);
      const fxGainLoss   = yPay.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);

      const netProfit    = grossProfit - commissions - expensesAmt - paymentFees + fxGainLoss;
      const margin       = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        year, revenue, cogs, grossProfit, commissions,
        expensesAmt, paymentFees, fxGainLoss,
        netProfit, margin, orderCount: yOrders.length,
      };
    });
  }, [invoices, vendorBills, expenses, orders, orderCosts, payments]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (yearlyData.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">No yearly data available. Create orders and invoices to see YoY comparisons.</p>;
  }

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* YoY Bar Chart */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Year-over-Year Comparison</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']}
              />
              <Legend />
              <Bar dataKey="revenue"    name="Revenue"    fill="hsl(217, 91%, 60%)" radius={[4,4,0,0]} />
              <Bar dataKey="cogs"       name="COGS"       fill="hsl(38,  92%, 50%)" radius={[4,4,0,0]} />
              <Bar dataKey="netProfit"  name="Net Profit" fill="hsl(142, 71%, 45%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full P&L per year */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Full P&L by Year</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-muted-foreground">Year</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Orders</th>
                <th className="text-right p-2 font-medium text-muted-foreground">💰 Revenue</th>
                <th className="text-right p-2 font-medium text-muted-foreground">📦 COGS</th>
                <th className="text-right p-2 font-medium text-muted-foreground">📊 Gross Profit</th>
                <th className="text-right p-2 font-medium text-muted-foreground">🤝 Commissions</th>
                <th className="text-right p-2 font-medium text-muted-foreground">🧾 Expenses</th>
                <th className="text-right p-2 font-medium text-muted-foreground">🏦 Pay Fees</th>
                <th className="text-right p-2 font-medium text-muted-foreground">💱 FX</th>
                <th className="text-right p-2 font-medium text-muted-foreground">🏆 Net Profit</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Margin</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.map(y => (
                <tr key={y.year} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 font-semibold">{y.year}</td>
                  <td className="p-2 text-right text-muted-foreground">{y.orderCount}</td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={y.revenue}     iqd={y.revenue     * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className="p-2 text-right text-red-500 font-mono text-xs">{fmt(y.cogs)}</td>
                  <td className={`p-2 text-right font-semibold ${y.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    <CurrencyDisplay usd={y.grossProfit} iqd={y.grossProfit * DEFAULT_FX_RATE} size="sm" />
                  </td>
                  <td className="p-2 text-right text-amber-600 font-mono text-xs">{fmt(y.commissions)}</td>
                  <td className="p-2 text-right text-orange-600 font-mono text-xs">{fmt(y.expensesAmt)}</td>
                  <td className="p-2 text-right text-slate-600 font-mono text-xs">{fmt(y.paymentFees)}</td>
                  <td className={`p-2 text-right font-mono text-xs ${y.fxGainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {y.fxGainLoss >= 0 ? '+' : '-'}{fmt(y.fxGainLoss)}
                  </td>
                  <td className={`p-2 text-right font-semibold ${y.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    <CurrencyDisplay usd={y.netProfit} iqd={y.netProfit * DEFAULT_FX_RATE} size="sm" />
                  </td>
                  <td className={`p-2 text-right font-mono text-xs ${y.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {y.margin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Net Profit = Revenue − COGS − Commissions − Expenses − Payment Fees ± FX Gain/Loss
        </p>
      </div>
    </div>
  );
}
