import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useState } from 'react';

const reportTypes = [
  { id: 'profitability', name: 'Profitability', desc: 'Profit per order, customer, route, mode' },
  { id: 'ar-aging', name: 'AR Aging', desc: 'Current / 30 / 60 / 90+ day buckets by customer' },
  { id: 'ap-aging', name: 'AP Aging', desc: 'Current / 30 / 60 / 90+ day buckets by vendor' },
  { id: 'cash-flow', name: 'Cash Flow', desc: 'Inflows, outflows, net by period' },
  { id: 'fx-gain-loss', name: 'FX Gain/Loss', desc: 'Table + chart + totals' },
  { id: 'monthly-pl', name: 'Monthly P&L', desc: 'Revenue → Net Profit' },
  { id: 'partner', name: 'Partner Report', desc: 'Commission liability & profit share' },
  { id: 'performance', name: 'Performance', desc: 'Vendor & employee metrics' },
  { id: 'yearly', name: 'Yearly Report', desc: 'YoY comparison with charts' },
];

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('2024-04-01');
  const [dateTo, setDateTo] = useState('2024-04-30');
  const [selectedReport, setSelectedReport] = useState('profitability');

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Reports
          </h1>
          <p className="erp-page-subtitle">All amounts computed using locked USD values</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="erp-metric-card flex items-end gap-4 flex-wrap">
        <div>
          <Label className="text-xs">From Date</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label className="text-xs">To Date</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
        </div>
        <Button size="sm">Apply Filter</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Report Selector */}
        <div className="erp-table-container p-0">
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <h3 className="text-sm font-semibold">Report Type</h3>
          </div>
          <div className="divide-y divide-border">
            {reportTypes.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors ${
                  selectedReport === r.id ? 'bg-accent border-l-2 border-l-primary' : ''
                }`}
              >
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="md:col-span-2 erp-metric-card">
          <h3 className="text-lg font-semibold mb-4">
            {reportTypes.find(r => r.id === selectedReport)?.name}
          </h3>
          {selectedReport === 'profitability' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <CurrencyDisplay usd={37500} iqd={49125000} size="md" layout="stacked" />
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Costs</p>
                  <CurrencyDisplay usd={26050} iqd={34125500} size="md" layout="stacked" />
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <CurrencyDisplay usd={11450} iqd={14999500} size="md" layout="stacked" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Select a date range and click Apply to generate detailed report data.</p>
            </div>
          )}
          {selectedReport !== 'profitability' && (
            <p className="text-muted-foreground">Select a date range and click Apply to generate this report.</p>
          )}
        </div>
      </div>
    </div>
  );
}
