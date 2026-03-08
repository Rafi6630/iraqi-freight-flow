import { Percent } from 'lucide-react';

export default function CommissionsPage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary" />
            Commissions
          </h1>
          <p className="erp-page-subtitle">Employee & broker commissions — USD | IQD</p>
        </div>
      </div>
      <div className="erp-metric-card text-center py-12 text-muted-foreground">
        Commissions are auto-generated when orders are closed (Step 9).
      </div>
    </div>
  );
}
