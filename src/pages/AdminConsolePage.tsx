import { useState } from 'react';
import {
  ShieldCheck, Trash2, Search, Shield, Clock, Users, AlertTriangle,
  Loader2, CheckCircle2, XCircle, Eye, Plus, Pencil, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTableQuery, useInsertMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Tables in dependency order for deletion
const DELETE_ORDER = [
  'payment_reminder_history', 'payment_reminders', 'customer_reminder_settings',
  'documents', 'commissions', 'payments', 'order_costs',
  'quotation_payment_terms', 'quotation_services', 'quotations',
  'invoices', 'vendor_bills', 'orders',
  'cofounder_capital', 'expenses', 'exchange_rate_history', 'exchange_rates',
  'employees', 'partners', 'vendors', 'customers',
];

type IntegrityIssue = { table: string; issue: string; count: number; severity: 'warning' | 'error' };

export default function AdminConsolePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Delete Demo Data state
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Data Integrity Scanner
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<IntegrityIssue[] | null>(null);

  // Role Management
  const { data: roles = [], isLoading: rolesLoading } = useTableQuery('user_roles', { orderBy: 'user_id' });
  const insertRole = useInsertMutation('user_roles');
  const deleteRole = useDeleteMutation('user_roles');
  const [roleDialog, setRoleDialog] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<string>('user');

  // Audit Log
  const { data: auditLogs = [], isLoading: auditLoading } = useTableQuery('audit_log', { orderBy: 'created_at' });
  const [auditSearch, setAuditSearch] = useState('');

  // --- Delete Demo Data ---
  const handleDeleteAll = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    setDeleteProgress([]);
    for (const table of DELETE_ORDER) {
      setDeleteProgress((prev) => [...prev, `Deleting ${table}...`]);
      const { error } = await (supabase.from(table as any) as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        setDeleteProgress((prev) => [...prev, `⚠ ${table}: ${error.message}`]);
      } else {
        setDeleteProgress((prev) => [...prev, `✓ ${table} cleared`]);
      }
    }
    setDeleting(false);
    qc.invalidateQueries();
    toast.success('All demo data deleted');
  };

  // --- Data Integrity Scanner ---
  const runScanner = async () => {
    setScanning(true);
    const issues: IntegrityIssue[] = [];

    // Orphan invoices (no customer)
    const { data: orphanInv } = await (supabase.from('invoices') as any).select('id').is('customer_id', null);
    if (orphanInv?.length) issues.push({ table: 'invoices', issue: 'Invoices with no customer', count: orphanInv.length, severity: 'warning' });

    // Orphan vendor bills (no vendor)
    const { data: orphanBills } = await (supabase.from('vendor_bills') as any).select('id').is('vendor_id', null);
    if (orphanBills?.length) issues.push({ table: 'vendor_bills', issue: 'Bills with no vendor', count: orphanBills.length, severity: 'warning' });

    // Orders stuck at step 1 for too long
    const { data: stuckOrders } = await (supabase.from('orders') as any).select('id').eq('status_step', 1);
    if (stuckOrders && stuckOrders.length > 5) issues.push({ table: 'orders', issue: 'Orders stuck at Step 1', count: stuckOrders.length, severity: 'warning' });

    // Payments without ref_id
    const { data: orphanPay } = await (supabase.from('payments') as any).select('id').is('ref_id', null);
    if (orphanPay?.length) issues.push({ table: 'payments', issue: 'Payments with no reference document', count: orphanPay.length, severity: 'error' });

    // Invoices where paid > amount
    const { data: overpaidInv } = await (supabase.from('invoices') as any).select('id, amount_usd, paid_usd');
    const overPaid = overpaidInv?.filter((i: any) => Number(i.paid_usd) > Number(i.amount_usd));
    if (overPaid?.length) issues.push({ table: 'invoices', issue: 'Overpaid invoices (paid > amount)', count: overPaid.length, severity: 'error' });

    // Missing exchange rates (no active rate)
    const { data: activeRates } = await (supabase.from('exchange_rates') as any).select('id').eq('status', 'Active');
    if (!activeRates?.length) issues.push({ table: 'exchange_rates', issue: 'No active exchange rates configured', count: 0, severity: 'error' });

    // Order costs without vendor
    const { data: orphanCosts } = await (supabase.from('order_costs') as any).select('id').is('vendor_id', null);
    if (orphanCosts?.length) issues.push({ table: 'order_costs', issue: 'Costs with no vendor assigned', count: orphanCosts.length, severity: 'warning' });

    if (issues.length === 0) {
      issues.push({ table: '', issue: 'No integrity issues found — data looks clean!', count: 0, severity: 'warning' });
    }

    setScanResults(issues);
    setScanning(false);
  };

  // --- Role Management ---
  const handleAddRole = () => {
    if (!newUserId.trim()) { toast.error('Enter a user ID'); return; }
    insertRole.mutate({ user_id: newUserId.trim(), role: newRole } as any);
    setRoleDialog(false);
    setNewUserId('');
    setNewRole('user');
  };

  const filteredAudit = auditLogs.filter((a: any) =>
    !auditSearch || [a.entity, a.action, a.actor, a.details].join(' ').toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Admin Console
          </h1>
          <p className="erp-page-subtitle">System administration, data management & audit trail</p>
        </div>
      </div>

      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tools">Admin Tools</TabsTrigger>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* ─── ADMIN TOOLS ─── */}
        <TabsContent value="tools">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delete Demo Data */}
            <div className="erp-metric-card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" /> Delete All Data
              </h3>
              <p className="text-xs text-muted-foreground">
                Removes all data in correct dependency order ({DELETE_ORDER.length} tables). This action is <strong>irreversible</strong>.
              </p>
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={deleting}>
                {deleting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Delete All Data
              </Button>
              {deleteProgress.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border bg-muted/50 p-2 text-xs font-mono space-y-0.5">
                  {deleteProgress.map((msg, i) => (
                    <div key={i} className={msg.startsWith('⚠') ? 'text-destructive' : 'text-muted-foreground'}>{msg}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Data Integrity Scanner */}
            <div className="erp-metric-card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" /> Data Integrity Scanner
              </h3>
              <p className="text-xs text-muted-foreground">
                Checks for orphan records, mismatched totals, missing FX rates, stuck orders, and overpayments.
              </p>
              <Button size="sm" onClick={runScanner} disabled={scanning}>
                {scanning && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Run Scanner
              </Button>
              {scanResults && (
                <div className="mt-2 space-y-1.5">
                  {scanResults.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {r.severity === 'error' ? (
                        <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                      ) : r.table === '' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                      )}
                      <span className="text-muted-foreground">
                        {r.issue}{r.count > 0 && <span className="font-mono ml-1">({r.count})</span>}
                        {r.table && <span className="ml-1 text-primary font-mono">[{r.table}]</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Info */}
            <div className="erp-metric-card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Current Session
              </h3>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>User:</strong> {user?.email}</p>
                <p><strong>User ID:</strong> <span className="font-mono text-[10px]">{user?.id}</span></p>
                <p><strong>Last Sign In:</strong> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="erp-metric-card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Quick Stats
              </h3>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Roles assigned:</strong> {roles.length}</p>
                <p><strong>Audit entries:</strong> {auditLogs.length}</p>
                <p><strong>Tables managed:</strong> {DELETE_ORDER.length}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── ROLE MANAGEMENT ─── */}
        <TabsContent value="roles">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> User Roles
              </h3>
              <Button size="sm" onClick={() => setRoleDialog(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Assign Role
              </Button>
            </div>

            <div className="erp-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">User ID</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesLoading ? (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
                    ) : roles.length === 0 ? (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">No roles assigned yet</td></tr>
                    ) : (
                      roles.map((r: any) => (
                        <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs">{r.user_id}</td>
                          <td className="px-5 py-3"><StatusBadge status={r.role} /></td>
                          <td className="px-5 py-3 text-center">
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteRole.mutate(r.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── AUDIT LOG ─── */}
        <TabsContent value="audit">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Audit Trail
              </h3>
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search logs..." value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div className="erp-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Timestamp</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Actor</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Entity</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Action</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLoading ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
                    ) : filteredAudit.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No audit entries found</td></tr>
                    ) : (
                      filteredAudit.map((a: any) => (
                        <tr key={a.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{new Date(a.created_at).toLocaleString()}</td>
                          <td className="px-5 py-3 text-xs">{a.actor || '—'}</td>
                          <td className="px-5 py-3"><StatusBadge status={a.entity} /></td>
                          <td className="px-5 py-3 text-xs">{a.action}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{a.details || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Confirm Data Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>ALL data</strong> from {DELETE_ORDER.length} tables in dependency order. 
            This action cannot be undone. Are you sure?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAll}>Yes, Delete Everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>User ID (UUID)</Label>
              <Input value={newUserId} onChange={(e) => setNewUserId(e.target.value)} placeholder="e.g. paste from Current Session" className="font-mono text-xs" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(false)}>Cancel</Button>
            <Button onClick={handleAddRole}>Assign Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
