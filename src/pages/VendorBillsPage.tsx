import { Receipt, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useTableQuery } from '@/hooks/use-supabase-query';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FxLockedBadge } from '@/components/FxLockedBadge';

export default function VendorBillsPage() {
  const [search, setSearch] = useState('');
  const { data: bills = [], isLoading } = useTableQuery<any>('vendor_bills');
  const { data: vendors = [] } = useTableQuery<any>('vendors');

  const filtered = bills.filter((b: any) =>
    (b.bill_no || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><Receipt className="w-6 h-6 text-primary" />Vendor Bills</h1>
          <p className="erp-page-subtitle">{bills.length} bills — USD | IQD</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search bills..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Bill #</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Vendor</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Paid</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Due Date</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">FX</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No vendor bills yet. Generate from Order Wizard Step 7.</td></tr>
                ) : filtered.map((b: any) => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-primary">{b.bill_no}</td>
                    <td className="px-5 py-3">{vendors.find((v: any) => v.id === b.vendor_id)?.company || '—'}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={b.amount_usd} iqd={b.amount_iqd} size="sm" /></td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={b.paid_usd || 0} iqd={b.paid_iqd || 0} size="sm" /></td>
                    <td className="px-5 py-3 text-muted-foreground">{b.due_date || '—'}</td>
                    <td className="px-5 py-3 text-center">{b.is_fx_locked && <FxLockedBadge />}</td>
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
