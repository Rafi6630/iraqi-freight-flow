import { CreditCard, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { mockPayments } from '@/lib/mock-data';
import { useState } from 'react';

export default function PaymentsPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Payments
          </h1>
          <p className="erp-page-subtitle">AR & AP payments with FX gain/loss tracking</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Pay #</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Counterparty</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Method</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">FX Gain/Loss</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {mockPayments.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-primary">{p.pay_no}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={p.direction} /></td>
                  <td className="px-5 py-3">{p.counterparty}</td>
                  <td className="px-5 py-3 text-right"><CurrencyDisplay usd={p.amount_usd} iqd={p.amount_iqd} size="sm" /></td>
                  <td className="px-5 py-3 text-muted-foreground">{p.method}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={p.fx_gain_loss_usd > 0 ? 'fx-gain' : p.fx_gain_loss_usd < 0 ? 'fx-loss' : 'text-muted-foreground'}>
                      {p.fx_gain_loss_usd > 0 ? '+' : ''}{p.fx_gain_loss_usd !== 0 ? `$${p.fx_gain_loss_usd.toFixed(2)}` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
