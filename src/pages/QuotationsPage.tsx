import { ClipboardList, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FxLockedBadge } from '@/components/FxLockedBadge';

export default function QuotationsPage() {
  const [search, setSearch] = useState('');
  const { data: quotations = [], isLoading } = useTableQuery<any>('quotations');

  const filtered = quotations.filter((q: any) =>
    (q.quote_no || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" />Quotations</h1>
          <p className="erp-page-subtitle">{quotations.length} quotations — USD | IQD</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Quote #</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Margin %</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Service Fee</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Validity</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">FX</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No quotations yet. Generate from Order Wizard Step 4.</td></tr>
                ) : filtered.map((q: any) => (
                  <tr key={q.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-primary">{q.quote_no}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={q.status} /></td>
                    <td className="px-5 py-3 text-right font-mono">{q.margin_pct}%</td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={q.service_fee_usd || 0} iqd={q.service_fee_iqd || 0} size="sm" /></td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={q.total_usd || 0} iqd={q.total_iqd || 0} size="sm" /></td>
                    <td className="px-5 py-3 text-muted-foreground">{q.validity_days} days</td>
                    <td className="px-5 py-3 text-center">{q.is_fx_locked && <FxLockedBadge />}</td>
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
