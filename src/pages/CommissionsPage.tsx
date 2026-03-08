import { Percent } from 'lucide-react';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { Skeleton } from '@/components/ui/skeleton';

export default function CommissionsPage() {
  const { data: commissions = [], isLoading } = useTableQuery<any>('commissions');
  const { data: employees = [] } = useTableQuery<any>('employees');
  const { data: partners = [] } = useTableQuery<any>('partners');

  const getPersonName = (type: string, personId: string) => {
    if (type === 'employee') return employees.find((e: any) => e.id === personId)?.name || '—';
    return partners.find((p: any) => p.id === personId)?.company || '—';
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><Percent className="w-6 h-6 text-primary" />Commissions</h1>
          <p className="erp-page-subtitle">{commissions.length} commissions — USD | IQD</p>
        </div>
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" /> : commissions.length === 0 ? (
        <div className="erp-metric-card text-center py-12 text-muted-foreground">Commissions are auto-generated when orders are closed (Step 9).</div>
      ) : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Person</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Rate</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c: any) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3"><StatusBadge status={c.type} /></td>
                    <td className="px-5 py-3">{getPersonName(c.type, c.person_id)}</td>
                    <td className="px-5 py-3 text-right font-mono">{c.rate}%</td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={c.amount_usd} iqd={c.amount_iqd} size="sm" /></td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
