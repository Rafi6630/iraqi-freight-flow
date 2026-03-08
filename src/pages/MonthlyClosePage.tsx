import { CalendarCheck } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';

const months = [
  { period: '2024-04', status: 'open' },
  { period: '2024-03', status: 'locked' },
  { period: '2024-02', status: 'closed' },
  { period: '2024-01', status: 'closed' },
];

export default function MonthlyClosePage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" />
            Monthly Close
          </h1>
          <p className="erp-page-subtitle">Period management — open → lock → close</p>
        </div>
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Period</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.period} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium">{m.period}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={m.status} /></td>
                  <td className="px-5 py-3 text-center">
                    {m.status === 'open' && <Button size="sm" variant="outline">Lock Period</Button>}
                    {m.status === 'locked' && <Button size="sm" variant="outline">Close Period</Button>}
                    {m.status === 'closed' && <span className="text-xs text-muted-foreground">Finalized</span>}
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
