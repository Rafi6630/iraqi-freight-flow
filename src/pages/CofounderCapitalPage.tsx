import { Landmark, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CofounderCapitalPage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" />
            Co-Founder Capital
          </h1>
          <p className="erp-page-subtitle">Track capital contributions — USD | IQD</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Add Contribution</Button>
      </div>
      <div className="erp-metric-card text-center py-12 text-muted-foreground">
        No contributions recorded yet.
      </div>
    </div>
  );
}
