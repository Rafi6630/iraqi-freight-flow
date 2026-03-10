import { useState, useMemo } from 'react';
import {
  ShieldCheck, Trash2, Search, Shield, Clock, Users, AlertTriangle,
  Loader2, CheckCircle2, XCircle, Eye, Plus, ChevronRight,
  Lock, Unlock, UserCheck, UserX, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTableQuery, useInsertMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// ─── Grouped tables in correct deletion order ────────────────────────────────
const TABLE_GROUPS: { id: string; label: string; icon: string; color: string; tables: string[] }[] = [
  {
    id: 'orders',
    label: 'Orders & Workflow',
    icon: '📦',
    color: 'blue',
    tables: [
      'payment_reminder_history', 'payment_reminders', 'customer_reminder_settings',
      'documents', 'commissions', 'payments', 'order_costs',
      'quotation_payment_terms', 'quotation_services', 'quotations',
      'invoices', 'vendor_bills', 'orders',
    ],
  },
  {
    id: 'capital',
    label: 'Capital & Expenses',
    icon: '💰',
    color: 'amber',
    tables: ['cofounder_transactions', 'cofounders', 'cofounder_capital', 'expenses'],
  },
  {
    id: 'contacts',
    label: 'Contacts & Reference',
    icon: '👥',
    color: 'green',
    tables: ['employees', 'partners', 'vendors', 'customers'],
  },
  {
    id: 'system',
    label: 'System & FX',
    icon: '⚙️',
    color: 'slate',
    tables: ['exchange_rate_history', 'exchange_rates'],
  },
];

// ─── Permissions matrix per role ─────────────────────────────────────────────
type Permission = { module: string; admin: boolean; manager: boolean; user: boolean; viewer: boolean };
const PERMISSIONS: Permission[] = [
  { module: '📦 Orders — Create/Edit',         admin: true,  manager: true,  user: true,  viewer: false },
  { module: '📦 Orders — Delete',              admin: true,  manager: true,  user: false, viewer: false },
  { module: '📋 Quotations',                   admin: true,  manager: true,  user: true,  viewer: true  },
  { module: '🧾 Invoices — Issue/Edit',        admin: true,  manager: true,  user: true,  viewer: false },
  { module: '🧾 Invoices — View Only',         admin: true,  manager: true,  user: true,  viewer: true  },
  { module: '💵 Payments — Record',            admin: true,  manager: true,  user: true,  viewer: false },
  { module: '📊 Reports — View',               admin: true,  manager: true,  user: true,  viewer: true  },
  { module: '📊 Reports — Export',             admin: true,  manager: true,  user: false, viewer: false },
  { module: '👥 Customers/Vendors — Manage',   admin: true,  manager: true,  user: true,  viewer: false },
  { module: '🤝 Partners/Commissions',         admin: true,  manager: true,  user: false, viewer: false },
  { module: '🧾 Expenses — Create',            admin: true,  manager: true,  user: true,  viewer: false },
  { module: '🧾 Expenses — Delete',            admin: true,  manager: false, user: false, viewer: false },
  { module: '🏦 Co-Founder Capital',           admin: true,  manager: false, user: false, viewer: false },
  { module: '📁 Document Hub',                 admin: true,  manager: true,  user: true,  viewer: true  },
  { module: '⚙️ Admin Console',               admin: true,  manager: false, user: false, viewer: false },
  { module: '🗑️ Delete All Data',             admin: true,  manager: false, user: false, viewer: false },
  { module: '👤 User & Role Management',       admin: true,  manager: false, user: false, viewer: false },
];

const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  user:    'bg-green-100 text-green-700 border-green-200',
  viewer:  'bg-slate-100 text-slate-600 border-slate-200',
};
const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin:   'Full system access — can delete data and manage users',
  manager: 'Operational access — orders, invoices, reports, no admin console',
  user:    'Standard access — create/edit orders, expenses, payments',
  viewer:  'Read-only — can view orders, reports, documents but not edit',
};

type IntegrityIssue = { table: string; issue: string; count: number; severity: 'warning' | 'error' };

export default function AdminConsolePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ─── Delete state ──────────────────────────────────────────────────────────
  const [selectedGroups, setSelectedGroups]   = useState<Set<string>>(new Set());
  const [selectedTables, setSelectedTables]   = useState<Set<string>>(new Set());
  const [deleting,        setDeleting]         = useState(false);
  const [deleteProgress,  setDeleteProgress]   = useState<string[]>([]);
  const [confirmDelete,   setConfirmDelete]    = useState(false);

  // ─── Scanner state ─────────────────────────────────────────────────────────
  const [scanning,    setScanning]    = useState(false);
  const [scanResults, setScanResults] = useState<IntegrityIssue[] | null>(null);

  // ─── Users & Roles ─────────────────────────────────────────────────────────
  const { data: roles = [],     isLoading: rolesLoading } = useTableQuery('user_roles', { orderBy: 'user_id' });
  const insertRole = useInsertMutation('user_roles');
  const deleteRole = useDeleteMutation('user_roles');
  const [roleDialog,    setRoleDialog]    = useState(false);
  const [editRoleId,    setEditRoleId]    = useState<string | null>(null);
  const [newUserId,     setNewUserId]     = useState('');
  const [newUserEmail,  setNewUserEmail]  = useState('');
  const [newUserName,   setNewUserName]   = useState('');
  const [newRole,       setNewRole]       = useState<string>('user');
  const [confirmDelRole, setConfirmDelRole] = useState<string | null>(null);

  // ─── Audit Log ─────────────────────────────────────────────────────────────
  const { data: auditLogs = [], isLoading: auditLoading } = useTableQuery('audit_log', { orderBy: 'created_at' });
  const [auditSearch, setAuditSearch] = useState('');

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const allTablesFlatInOrder = TABLE_GROUPS.flatMap(g => g.tables);

  const toggleGroup = (groupId: string) => {
    const group = TABLE_GROUPS.find(g => g.id === groupId)!;
    const allSelected = group.tables.every(t => selectedTables.has(t));
    const next = new Set(selectedTables);
    if (allSelected) {
      group.tables.forEach(t => next.delete(t));
      const nextGroups = new Set(selectedGroups);
      nextGroups.delete(groupId);
      setSelectedGroups(nextGroups);
    } else {
      group.tables.forEach(t => next.add(t));
      setSelectedGroups(prev => new Set([...prev, groupId]));
    }
    setSelectedTables(next);
  };

  const toggleTable = (table: string, groupId: string) => {
    const next = new Set(selectedTables);
    if (next.has(table)) next.delete(table); else next.add(table);
    setSelectedTables(next);
    // Update group checkbox state
    const group = TABLE_GROUPS.find(g => g.id === groupId)!;
    const nextGroups = new Set(selectedGroups);
    if (group.tables.every(t => next.has(t))) nextGroups.add(groupId);
    else nextGroups.delete(groupId);
    setSelectedGroups(nextGroups);
  };

  const selectAll = () => {
    setSelectedTables(new Set(allTablesFlatInOrder));
    setSelectedGroups(new Set(TABLE_GROUPS.map(g => g.id)));
  };
  const clearAll = () => {
    setSelectedTables(new Set());
    setSelectedGroups(new Set());
  };

  const tablesToDelete = allTablesFlatInOrder.filter(t => selectedTables.has(t));

  // ─── Delete handler ────────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    setDeleteProgress([]);
    for (const table of tablesToDelete) {
      setDeleteProgress(p => [...p, `Deleting ${table}...`]);
      const { error } = await (supabase.from(table as any) as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setDeleteProgress(p => [...p, error ? `⚠ ${table}: ${error.message}` : `✓ ${table} cleared`]);
    }
    setDeleting(false);
    clearAll();
    qc.invalidateQueries();
    toast.success(`${tablesToDelete.length} table(s) cleared`);
  };

  // ─── Scanner ───────────────────────────────────────────────────────────────
  const runScanner = async () => {
    setScanning(true);
    const issues: IntegrityIssue[] = [];
    const { data: orphanInv }   = await (supabase.from('invoices') as any).select('id').is('customer_id', null);
    if (orphanInv?.length)       issues.push({ table: 'invoices',       issue: 'Invoices with no customer',               count: orphanInv.length,   severity: 'warning' });
    const { data: orphanBills }  = await (supabase.from('vendor_bills') as any).select('id').is('vendor_id', null);
    if (orphanBills?.length)     issues.push({ table: 'vendor_bills',   issue: 'Bills with no vendor',                    count: orphanBills.length, severity: 'warning' });
    const { data: stuckOrders }  = await (supabase.from('orders') as any).select('id').eq('status_step', 1);
    if (stuckOrders && stuckOrders.length > 5) issues.push({ table: 'orders', issue: 'Orders stuck at Step 1', count: stuckOrders.length, severity: 'warning' });
    const { data: orphanPay }    = await (supabase.from('payments') as any).select('id').is('ref_id', null);
    if (orphanPay?.length)       issues.push({ table: 'payments',       issue: 'Payments with no reference',              count: orphanPay.length,   severity: 'error' });
    const { data: overpaidInv }  = await (supabase.from('invoices') as any).select('id, amount_usd, paid_usd');
    const overPaid = overpaidInv?.filter((i: any) => Number(i.paid_usd) > Number(i.amount_usd));
    if (overPaid?.length)        issues.push({ table: 'invoices',       issue: 'Overpaid invoices',                       count: overPaid.length,    severity: 'error' });
    const { data: orphanCosts }  = await (supabase.from('order_costs') as any).select('id, category').is('vendor_id', null);
    const nonCommCosts = orphanCosts?.filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive');
    if (nonCommCosts?.length)    issues.push({ table: 'order_costs',    issue: 'Costs with no vendor assigned',           count: nonCommCosts.length, severity: 'warning' });
    // Check cofounders ownership adds to 100
    const { data: founders }     = await (supabase.from('cofounders') as any).select('ownership_pct');
    if (founders?.length) {
      const total = founders.reduce((s: number, f: any) => s + (f.ownership_pct || 0), 0);
      if (Math.abs(total - 100) > 0.01) issues.push({ table: 'cofounders', issue: `Ownership total is ${total}% (must be 100%)`, count: founders.length, severity: 'error' });
    }
    if (issues.length === 0) issues.push({ table: '', issue: 'No integrity issues found — data looks clean!', count: 0, severity: 'warning' });
    setScanResults(issues);
    setScanning(false);
  };

  // ─── Role handlers ─────────────────────────────────────────────────────────
  const handleAddRole = async () => {
    if (!newUserId.trim()) { toast.error('Enter a user ID'); return; }
    await insertRole.mutateAsync({ user_id: newUserId.trim(), role: newRole } as any);
    toast.success(`Role "${newRole}" assigned`);
    setRoleDialog(false);
    setNewUserId(''); setNewUserEmail(''); setNewUserName(''); setNewRole('user');
  };

  const filteredAudit = auditLogs.filter((a: any) =>
    !auditSearch || [a.entity, a.action, a.actor, a.details].join(' ').toLowerCase().includes(auditSearch.toLowerCase())
  );

  const groupColor = (color: string) => ({
    blue:  'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20',
    amber: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20',
    green: 'border-green-200 bg-green-50/50 dark:bg-green-950/20',
    slate: 'border-slate-200 bg-slate-50/50 dark:bg-slate-950/20',
  }[color] || '');

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Admin Console
          </h1>
          <p className="erp-page-subtitle">System administration · selective data deletion · user permissions</p>
        </div>
      </div>

      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tools">🛠 Admin Tools</TabsTrigger>
          <TabsTrigger value="delete">🗑️ Delete Data</TabsTrigger>
          <TabsTrigger value="users">👤 Users & Permissions</TabsTrigger>
          <TabsTrigger value="audit">📋 Audit Log</TabsTrigger>
        </TabsList>

        {/* ─── ADMIN TOOLS ─────────────────────────────────────────────────── */}
        <TabsContent value="tools">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="erp-metric-card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" /> Data Integrity Scanner
              </h3>
              <p className="text-xs text-muted-foreground">
                Checks for orphan records, mismatched totals, stuck orders, overpayments, and co-founder ownership totals.
              </p>
              <Button size="sm" onClick={runScanner} disabled={scanning}>
                {scanning && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Run Scanner
              </Button>
              {scanResults && (
                <div className="mt-2 space-y-1.5">
                  {scanResults.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {r.severity === 'error' ? <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        : r.table === '' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />}
                      <span className="text-muted-foreground">
                        {r.issue}{r.count > 0 && <span className="font-mono ml-1">({r.count})</span>}
                        {r.table && <span className="ml-1 text-primary font-mono">[{r.table}]</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="erp-metric-card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Current Session
              </h3>
              <div className="text-xs space-y-1.5 text-muted-foreground">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>User ID:</strong></p>
                <p className="font-mono text-[10px] bg-muted/50 p-1.5 rounded break-all select-all">{user?.id}</p>
                <p><strong>Last Sign In:</strong> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard.writeText(user?.id || '');
                toast.success('User ID copied');
              }}>Copy My User ID</Button>
            </div>

            <div className="erp-metric-card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Quick Stats
              </h3>
              <div className="text-xs space-y-1.5 text-muted-foreground">
                <p><strong>Roles assigned:</strong> {roles.length}</p>
                <p><strong>Audit entries:</strong> {auditLogs.length}</p>
                <p><strong>Tables managed:</strong> {allTablesFlatInOrder.length}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── DELETE DATA ─────────────────────────────────────────────────── */}
        <TabsContent value="delete">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-destructive" /> Select Data to Delete
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedTables.size === 0
                    ? 'Select groups or individual tables below'
                    : `${selectedTables.size} table(s) selected · ${tablesToDelete.length} will be cleared in dependency order`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>Select All</Button>
                <Button size="sm" variant="ghost"   onClick={clearAll}>Clear</Button>
                <Button size="sm" variant="destructive"
                  disabled={selectedTables.size === 0 || deleting}
                  onClick={() => setConfirmDelete(true)}>
                  {deleting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Delete Selected ({selectedTables.size})
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TABLE_GROUPS.map(group => {
                const allSel  = group.tables.every(t => selectedTables.has(t));
                const someSel = group.tables.some(t => selectedTables.has(t));
                return (
                  <div key={group.id} className={`rounded-lg border p-3 space-y-2 ${groupColor(group.color)}`}>
                    {/* Group header */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSel}
                        data-state={someSel && !allSel ? 'indeterminate' : allSel ? 'checked' : 'unchecked'}
                        onCheckedChange={() => toggleGroup(group.id)}
                        className="rounded"
                      />
                      <span className="font-semibold text-sm">
                        {group.icon} {group.label}
                      </span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {group.tables.filter(t => selectedTables.has(t)).length}/{group.tables.length}
                      </Badge>
                    </div>
                    {/* Individual tables */}
                    <div className="ml-6 grid grid-cols-1 gap-1">
                      {group.tables.map(table => (
                        <label key={table} className="flex items-center gap-2 cursor-pointer group">
                          <Checkbox
                            checked={selectedTables.has(table)}
                            onCheckedChange={() => toggleTable(table, group.id)}
                            className="rounded"
                          />
                          <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                            {table}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress log */}
            {deleteProgress.length > 0 && (
              <div className="rounded border border-border bg-muted/50 p-3 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Deletion Log</p>
                <div className="space-y-0.5 font-mono text-xs">
                  {deleteProgress.map((msg, i) => (
                    <div key={i} className={msg.startsWith('⚠') ? 'text-destructive' : msg.startsWith('✓') ? 'text-green-600' : 'text-muted-foreground'}>
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── USERS & PERMISSIONS ─────────────────────────────────────────── */}
        <TabsContent value="users">
          <div className="space-y-6">
            {/* ── Assigned Users ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" /> Assigned Users
                </h3>
                <Button size="sm" onClick={() => setRoleDialog(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add User
                </Button>
              </div>

              <div className="erp-table-container">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name / Email</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">User ID</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Access Level</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolesLoading ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
                      ) : roles.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users assigned yet. Click "Add User" to get started.</td></tr>
                      ) : (
                        (roles as any[]).map((r: any) => (
                          <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium">{r.display_name || '—'}</p>
                              <p className="text-xs text-muted-foreground">{r.email || 'No email stored'}</p>
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground max-w-[120px] truncate" title={r.user_id}>
                              {r.user_id}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[r.role] || ''}`}>
                                {r.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                              {ROLE_DESCRIPTIONS[r.role] || ''}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button variant="ghost" size="sm" className="text-destructive"
                                onClick={() => setConfirmDelRole(r.id)}>
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

            {/* ── Permissions Matrix ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Permissions Matrix
              </h3>
              <p className="text-xs text-muted-foreground">What each role level can access in this system.</p>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-64">Module / Action</th>
                      {(['admin', 'manager', 'user', 'viewer'] as const).map(role => (
                        <th key={role} className="text-center px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[role]}`}>
                            {role}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map((perm, i) => (
                      <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{perm.module}</td>
                        {(['admin', 'manager', 'user', 'viewer'] as const).map(role => (
                          <td key={role} className="px-4 py-2 text-center">
                            {perm[role]
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                              : <XCircle      className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Role legend cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {(['admin', 'manager', 'user', 'viewer'] as const).map(role => (
                  <div key={role} className={`rounded-lg border p-3 ${ROLE_COLORS[role]}`}>
                    <p className="font-bold text-sm capitalize mb-1">{role}</p>
                    <p className="text-xs opacity-80">{ROLE_DESCRIPTIONS[role]}</p>
                    <p className="text-xs font-semibold mt-2">
                      {PERMISSIONS.filter(p => p[role]).length} / {PERMISSIONS.length} permissions
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── AUDIT LOG ───────────────────────────────────────────────────── */}
        <TabsContent value="audit">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Audit Trail
              </h3>
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search logs..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="pl-9" />
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
                      <tr><td colSpan={5} className="px-5 py-8 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
                    ) : filteredAudit.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No audit entries found</td></tr>
                    ) : (
                      (filteredAudit as any[]).map((a: any) => (
                        <tr key={a.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{new Date(a.created_at).toLocaleString()}</td>
                          <td className="px-5 py-3 text-xs">{a.actor || '—'}</td>
                          <td className="px-5 py-3 text-xs font-mono text-primary">{a.entity}</td>
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

      {/* ─── Confirm Delete Dialog ──────────────────────────────────────────── */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>You are about to permanently delete data from <strong>{tablesToDelete.length} tables</strong>:</p>
                <div className="bg-muted/50 rounded p-2 max-h-36 overflow-y-auto">
                  {tablesToDelete.map(t => (
                    <p key={t} className="font-mono text-xs text-destructive">• {t}</p>
                  ))}
                </div>
                <p className="text-destructive font-medium">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteSelected}>
              Yes, Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Confirm Delete Role Dialog ────────────────────────────────────── */}
      <AlertDialog open={!!confirmDelRole} onOpenChange={() => setConfirmDelRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>This will remove the user's role. They will lose all access permissions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => { deleteRole.mutate(confirmDelRole!); setConfirmDelRole(null); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Add User Dialog ────────────────────────────────────────────────── */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add User & Assign Role</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input placeholder="e.g. Ahmed Hassan" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Email (optional, for display)</Label>
              <Input placeholder="e.g. ahmed@company.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">User ID (UUID from Supabase Auth) *</Label>
              <Input value={newUserId} onChange={e => setNewUserId(e.target.value)}
                placeholder="Paste UUID from Admin Tools → Current Session"
                className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground mt-1">
                Find your own UUID in the Admin Tools tab → Current Session → Copy My User ID
              </p>
            </div>
            <div>
              <Label className="text-xs">Role *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['admin', 'manager', 'user', 'viewer'] as const).map(r => (
                    <SelectItem key={r} value={r}>
                      <div className="flex flex-col">
                        <span className="capitalize font-medium">{r}</span>
                        <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newRole && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {PERMISSIONS.filter(p => p[newRole as keyof Permission] === true).length} permissions granted
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(false)}>Cancel</Button>
            <Button onClick={handleAddRole} disabled={insertRole.isPending || !newUserId.trim()}>
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
