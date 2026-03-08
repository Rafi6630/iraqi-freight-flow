import { Receipt } from 'lucide-react';

export default function VendorBillsPage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Vendor Bills
          </h1>
          <p className="erp-page-subtitle">Manage vendor bills — USD | IQD</p>
        </div>
      </div>
      <div className="erp-metric-card text-center py-12 text-muted-foreground">
        Vendor bills are generated from the Order Wizard (Step 7).
      </div>
    </div>
  );
}
