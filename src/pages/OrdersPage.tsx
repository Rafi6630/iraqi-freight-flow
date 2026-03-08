import { Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { mockOrders } from '@/lib/mock-data';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const stepLabels: Record<number, string> = {
  1: 'Setup', 2: 'Shipment', 3: 'Cost Sheet', 4: 'Quotation', 5: 'Approval',
  6: 'Execution', 7: 'Invoice', 8: 'Payment', 9: 'Closed',
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const filtered = mockOrders.filter(o =>
    o.order_no.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Orders
          </h1>
          <p className="erp-page-subtitle">{mockOrders.length} orders — 9-step workflow</p>
        </div>
        <Button onClick={() => navigate('/orders/new')}><Plus className="w-4 h-4 mr-2" />New Order</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Order #</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Mode</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Direction</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Step</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">ETD / ETA</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                  <td className="px-5 py-3 font-mono font-medium text-primary">{o.order_no}</td>
                  <td className="px-5 py-3">{o.customer}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{o.origin} → {o.destination}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={o.mode} /></td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={o.direction} /></td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className={`step-indicator text-xs ${o.status_step === 9 ? 'step-complete' : 'step-current'}`}>
                        {o.status_step}
                      </div>
                      <span className="text-xs text-muted-foreground">{stepLabels[o.status_step]}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {o.etd || '—'} → {o.eta || '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {o.revenue_usd > 0 ? <CurrencyDisplay usd={o.revenue_usd} iqd={o.revenue_usd * 1310} size="sm" /> : <span className="text-muted-foreground">—</span>}
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
