import { useMemo } from 'react';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { DEFAULT_FX_RATE } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Props {
  dateFrom: string;
  dateTo: string;
}

export function YearlyReport({ dateFrom, dateTo }: Props) {
  const { data: invoices = [], isLoading } = useTableQuery<any>('invoices');
  const { data: vendorBills = [] } = useTableQuery<any>('vendor_bills');
  const { data: expenses = [] } = useTableQuery<any>('expenses');
  const { data: orders = [] } = useTableQuery<any>('orders');

  const yearlyData = useMemo(() => {
    const years = new Set<string>();

    invoices.forEach((i: any) => { if (i.issued_date) years.add(i.issued_date.slice(0, 4)); });
    vendorBills.forEach((b: any) => { if (b.issued_date) years.add(b.issued_date.slice(0, 4)); });
    orders.forEach((o: any) => { if (o.created_at) years.add(o.created_at.slice(0, 4)); });

    const sortedYears = [...years].sort();

    return sortedYears.map(year => {
      const yInv = invoices.filter((i: any) => i.issued_date?.startsWith(year));
      const yBills = vendorBills.filter((b: any) => b.issued_date?.startsWith(year));
      const yExp = expenses.filter((e: any) => e.date?.startsWith(year));
      const yOrders = orders.filter((o: any) => o.created_at?.startsWith(year));

      const revenue = yInv.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
      const costs = yBills.reduce((s: number, b: any) => s + (b.amount_usd || 0), 0);
      const opex = yExp.reduce((s: number, e: any) => s + (e.amount_usd || 0), 0);
      const netProfit = revenue - costs - opex;

      return { year, revenue, costs, opex, netProfit, orderCount: yOrders.length };
    });
  }, [invoices, vendorBills, expenses, orders]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (yearlyData.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">No yearly data available. Create orders and invoices to see YoY comparisons.</p>;
  }

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
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" name="Costs" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netProfit" name="Net Profit" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year Summary Grid */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Yearly Summary</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-muted-foreground">Year</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Orders</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Costs</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Expenses</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.map(y => (
                <tr key={y.year} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 font-semibold">{y.year}</td>
                  <td className="p-2 text-right">{y.orderCount}</td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={y.revenue} iqd={y.revenue * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={y.costs} iqd={y.costs * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={y.opex} iqd={y.opex * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className={`p-2 text-right font-semibold ${y.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    <CurrencyDisplay usd={y.netProfit} iqd={y.netProfit * DEFAULT_FX_RATE} size="sm" />
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
