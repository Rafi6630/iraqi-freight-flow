import { ShieldCheck, Trash2, Search, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminConsolePage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Admin Console
          </h1>
          <p className="erp-page-subtitle">System administration & data management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Delete Demo Data */}
        <div className="erp-metric-card space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" /> Delete Demo Data
          </h3>
          <p className="text-xs text-muted-foreground">
            Removes all demo/test data in correct dependency order (18 steps). This action is irreversible.
          </p>
          <Button variant="destructive" size="sm">Delete All Demo Data</Button>
        </div>

        {/* Data Integrity Scanner */}
        <div className="erp-metric-card space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" /> Data Integrity Scanner
          </h3>
          <p className="text-xs text-muted-foreground">
            Checks for orphan records, mismatched totals, missing FX rates, and stuck orders.
          </p>
          <Button size="sm">Run Scanner</Button>
        </div>

        {/* Role Management */}
        <div className="erp-metric-card space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Role & Permissions
          </h3>
          <p className="text-xs text-muted-foreground">
            Create, edit, delete roles. Assign granular permissions per module.
          </p>
          <Button size="sm">Manage Roles</Button>
        </div>
      </div>
    </div>
  );
}
