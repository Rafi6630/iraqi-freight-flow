import { UserCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { mockEmployees } from '@/lib/mock-data';

export default function EmployeesPage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Employees
          </h1>
          <p className="erp-page-subtitle">{mockEmployees.length} employees</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Commission %</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockEmployees.map((e) => (
                <tr key={e.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{e.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{e.role}</td>
                  <td className="px-5 py-3 text-right font-mono">{e.commission_rate_pct}%</td>
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
