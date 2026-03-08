import { Bell, Search, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useState } from 'react';

const mockReminders = [
  { id: '1', customer: 'Al-Rasheed Trading Co.', invoice: 'INV-2024-0001', due_date: '2024-05-01', days_overdue: 0, last_sent: '2024-04-28', next: '2024-05-01', amount_usd: 6250, amount_iqd: 8187500 },
  { id: '2', customer: 'Basra Logistics LLC', invoice: 'INV-2024-0003', due_date: '2024-04-15', days_overdue: 23, last_sent: '2024-04-29', next: '2024-05-06', amount_usd: 2200, amount_iqd: 2882000 },
];

export default function PaymentRemindersPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Payment Reminders
          </h1>
          <p className="erp-page-subtitle">Automated AR Collection System</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><SettingsIcon className="w-4 h-4 mr-2" />Escalation Settings</Button>
          <Button variant="outline">📧 Email Templates</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search reminders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Invoice</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount Due</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Days Overdue</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Last Sent</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Next Reminder</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockReminders.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{r.customer}</td>
                  <td className="px-5 py-3 font-mono text-primary">{r.invoice}</td>
                  <td className="px-5 py-3 text-right"><CurrencyDisplay usd={r.amount_usd} iqd={r.amount_iqd} size="sm" /></td>
                  <td className="px-5 py-3 text-muted-foreground">{r.due_date}</td>
                  <td className="px-5 py-3 text-center">
                    {r.days_overdue > 0 ? (
                      <span className="fx-loss font-mono">{r.days_overdue}d</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{r.last_sent}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.next}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm">Send</Button>
                      <Button variant="ghost" size="sm">👁️</Button>
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
