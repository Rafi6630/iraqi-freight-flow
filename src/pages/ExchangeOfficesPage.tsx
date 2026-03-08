import { ArrowLeftRight, Plus, Eye, History, Search, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { mockExchangeRates } from '@/lib/mock-data';
import { useState } from 'react';
import { formatUSD, formatIQD, DEFAULT_FX_RATE } from '@/lib/currency';

export default function ExchangeOfficesPage() {
  const [search, setSearch] = useState('');
  const [calcAmount, setCalcAmount] = useState('1000');
  const [calcFrom, setCalcFrom] = useState('USD');
  const [calcTo, setCalcTo] = useState('IQD');

  const calcResult = calcFrom === 'USD'
    ? parseFloat(calcAmount || '0') * DEFAULT_FX_RATE
    : parseFloat(calcAmount || '0') / DEFAULT_FX_RATE;

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            Exchange Offices
          </h1>
          <p className="erp-page-subtitle">Full exchange rate management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">⚙️ Auto-Update Settings</Button>
          <Button><Plus className="w-4 h-4 mr-2" />Add Rate</Button>
        </div>
      </div>

      {/* Calculator Widget */}
      <div className="erp-metric-card">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" /> Currency Converter
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="number"
            value={calcAmount}
            onChange={(e) => setCalcAmount(e.target.value)}
            className="w-40"
          />
          <select
            value={calcFrom}
            onChange={(e) => { setCalcFrom(e.target.value); setCalcTo(e.target.value === 'USD' ? 'IQD' : 'USD'); }}
            className="px-3 py-2 border border-input rounded-md bg-card text-sm"
          >
            <option value="USD">USD</option>
            <option value="IQD">IQD</option>
          </select>
          <span className="text-muted-foreground">→</span>
          <span className="font-mono font-medium text-lg">
            {calcTo === 'IQD' ? formatIQD(calcResult) : formatUSD(calcResult)}
          </span>
          <span className="text-xs text-muted-foreground ml-2">Rate: {DEFAULT_FX_RATE.toLocaleString()}</span>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search rates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Currency Pair</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Exchange Rate</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Effective Date</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Updated By</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockExchangeRates.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium">{r.currency_from}/{r.currency_to}</td>
                  <td className="px-5 py-3 text-right font-mono">{r.exchange_rate.toLocaleString()}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.effective_date}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.updated_by}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" title="Edit">✏️</Button>
                      <Button variant="ghost" size="sm" title="History"><History className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" title="View"><Eye className="w-4 h-4" /></Button>
                    </div>
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
