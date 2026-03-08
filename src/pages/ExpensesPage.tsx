import { DollarSign, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { mockExpenses } from '@/lib/mock-data';
import { useState } from 'react';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Expenses
          </h1>
          <p className="erp-page-subtitle">Operational expenses — USD | IQD</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Exp #</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockExpenses.map((e) => (
                <tr key={e.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-primary">{e.exp_no}</td>
                  <td className="px-5 py-3">{e.category}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.description}</td>
                  <td className="px-5 py-3 text-right"><CurrencyDisplay usd={e.amount_usd} iqd={e.amount_iqd} size="sm" /></td>
                  <td className="px-5 py-3 text-muted-foreground">{e.date}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
