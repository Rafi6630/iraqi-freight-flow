import { Users, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { mockCustomers } from '@/lib/mock-data';
import { useState } from 'react';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const filtered = mockCustomers.filter(c =>
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Customers
          </h1>
          <p className="erp-page-subtitle">{mockCustomers.length} customers registered</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">City</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Terms</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Credit Limit</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{c.company}</td>
                  <td className="px-5 py-3">
                    <div>{c.contact_name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{c.city}</td>
                  <td className="px-5 py-3">{c.payment_terms_days} days</td>
                  <td className="px-5 py-3 text-right">
                    <CurrencyDisplay usd={c.credit_limit_usd} iqd={c.credit_limit_usd * 1310} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-center">
                    <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
