import { ClipboardList } from 'lucide-react';

export default function QuotationsPage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Quotations
          </h1>
          <p className="erp-page-subtitle">Manage quotations — all amounts in USD | IQD</p>
        </div>
      </div>
      <div className="erp-metric-card text-center py-12 text-muted-foreground">
        Quotations are generated from the Order Wizard (Step 4). Navigate to Orders to create quotations.
      </div>
    </div>
  );
}
