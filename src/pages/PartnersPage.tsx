import { Handshake, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartnersPage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Handshake className="w-6 h-6 text-primary" />
            Partners
          </h1>
          <p className="erp-page-subtitle">Manage broker and partner relationships</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Add Partner</Button>
      </div>
      <div className="erp-metric-card text-center py-12 text-muted-foreground">
        No partners configured yet. Add your first partner to get started.
      </div>
    </div>
  );
}
