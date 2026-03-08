import { Truck, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { mockVendors } from '@/lib/mock-data';
import { useState } from 'react';

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const filtered = mockVendors.filter(v =>
    v.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Vendors
          </h1>
          <p className="erp-page-subtitle">{mockVendors.length} vendors registered</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Add Vendor</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">City</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Rating</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{v.company}</td>
                  <td className="px-5 py-3"><StatusBadge status={v.type} /></td>
                  <td className="px-5 py-3 text-muted-foreground">{v.city}</td>
                  <td className="px-5 py-3">
                    <div className="text-xs text-muted-foreground">{v.email}</div>
                    <div className="text-xs text-muted-foreground">{v.phone}</div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-mono font-medium">{v.rating}</span>
                    <span className="text-muted-foreground">/5</span>
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
