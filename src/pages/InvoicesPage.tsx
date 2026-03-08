import { FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useState } from 'react';

const mockInvoices = [
  { id: '1', invoice_no: 'INV-2024-0001', customer: 'Al-Rasheed Trading Co.', order: 'ORD-2024-0001', status: 'partial', amount_usd: 12500, amount_iqd: 16375000, paid_usd: 6250, issued: '2024-04-01', due: '2024-05-01' },
  { id: '2', invoice_no: 'INV-2024-0002', customer: 'Tigris Commerce Group', order: 'ORD-2024-0004', status: 'paid', amount_usd: 18000, amount_iqd: 23580000, paid_usd: 18000, issued: '2024-03-10', due: '2024-04-10' },
];

export default function InvoicesPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Invoices
          </h1>
          <p className="erp-page-subtitle">Customer invoices — USD | IQD</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Invoice #</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Order</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Paid</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-primary">{inv.invoice_no}</td>
                  <td className="px-5 py-3">{inv.customer}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{inv.order}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3 text-right"><CurrencyDisplay usd={inv.amount_usd} iqd={inv.amount_iqd} size="sm" /></td>
                  <td className="px-5 py-3 text-right"><CurrencyDisplay usd={inv.paid_usd} iqd={inv.paid_usd * 1310} size="sm" /></td>
                  <td className="px-5 py-3 text-muted-foreground">{inv.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
