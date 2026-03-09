import { useMemo } from 'react';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { DEFAULT_FX_RATE } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  dateFrom: string;
  dateTo: string;
}

export function PartnerReport({ dateFrom, dateTo }: Props) {
  const { data: partners = [], isLoading } = useTableQuery<any>('partners');
  const { data: commissions = [] } = useTableQuery<any>('commissions');
  const { data: orders = [] } = useTableQuery<any>('orders');
  const { data: invoices = [] } = useTableQuery<any>('invoices');
  const { data: orderCosts = [] } = useTableQuery<any>('order_costs');

  const partnerData = useMemo(() => {
    return partners.map((p: any) => {
      const pComm = commissions.filter((c: any) => c.type === 'partner' && c.person_id === p.id);
      const accrued = pComm.filter((c: any) => c.status === 'accrued').reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
      const approved = pComm.filter((c: any) => c.status === 'approved').reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
      const paid = pComm.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
      const totalLiability = accrued + approved;

      // Profit share: revenue - costs - commissions for orders linked to this partner's commissions
      const orderIds = [...new Set(pComm.map((c: any) => c.order_id).filter(Boolean))];
      const revenue = invoices.filter((i: any) => orderIds.includes(i.order_id)).reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
      const costs = orderCosts.filter((oc: any) => orderIds.includes(oc.order_id)).reduce((s: number, oc: any) => s + (oc.amount_usd || 0), 0);
      const totalComm = pComm.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
      const netProfit = revenue - costs - totalComm;

      return { ...p, accrued, approved, paid, totalLiability, revenue, costs, totalComm, netProfit };
    });
  }, [partners, commissions, invoices, orderCosts]);

  const totals = useMemo(() => ({
    liability: partnerData.reduce((s: number, p: any) => s + p.totalLiability, 0),
    paid: partnerData.reduce((s: number, p: any) => s + p.paid, 0),
    netProfit: partnerData.reduce((s: number, p: any) => s + p.netProfit, 0),
  }), [partnerData]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Outstanding Liability</p>
          <CurrencyDisplay usd={totals.liability} iqd={totals.liability * DEFAULT_FX_RATE} size="md" layout="stacked" />
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Total Paid</p>
          <CurrencyDisplay usd={totals.paid} iqd={totals.paid * DEFAULT_FX_RATE} size="md" layout="stacked" />
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Net Profit (after comm.)</p>
          <CurrencyDisplay usd={totals.netProfit} iqd={totals.netProfit * DEFAULT_FX_RATE} size="md" layout="stacked" />
        </div>
      </div>

      {/* Commission Liability Table */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Commission Liability by Partner</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-muted-foreground">Partner</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Accrued</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Approved</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Paid</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {partnerData.map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 font-medium">{p.company}</td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={p.accrued} iqd={p.accrued * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={p.approved} iqd={p.approved * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={p.paid} iqd={p.paid * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className="p-2 text-right font-semibold"><CurrencyDisplay usd={p.totalLiability} iqd={p.totalLiability * DEFAULT_FX_RATE} size="sm" /></td>
                </tr>
              ))}
              {partnerData.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No partners found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profit Share Table */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Profit Share by Partner</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-muted-foreground">Partner</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Costs</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Commissions</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {partnerData.map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 font-medium">{p.company}</td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={p.revenue} iqd={p.revenue * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={p.costs} iqd={p.costs * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className="p-2 text-right"><CurrencyDisplay usd={p.totalComm} iqd={p.totalComm * DEFAULT_FX_RATE} size="sm" /></td>
                  <td className={`p-2 text-right font-semibold ${p.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    <CurrencyDisplay usd={p.netProfit} iqd={p.netProfit * DEFAULT_FX_RATE} size="sm" />
                  </td>
                </tr>
              ))}
              {partnerData.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No partners found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
