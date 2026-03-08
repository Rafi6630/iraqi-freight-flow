import { Handshake, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { useTableQuery, useInsertMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Partner {
  id: string;
  company: string;
  commission_type: 'pct' | 'fixed' | null;
  rate_value: number | null;
  status: string | null;
  created_at: string | null;
}

const emptyForm = { company: '', commission_type: 'pct' as 'pct' | 'fixed', rate_value: 0, status: 'active' };

export default function PartnersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: partners = [], isLoading } = useTableQuery<Partner>('partners');
  const insertMut = useInsertMutation('partners');
  const updateMut = useUpdateMutation('partners');
  const deleteMut = useDeleteMutation('partners');

  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Partner) => {
    setEditId(p.id);
    setForm({ company: p.company, commission_type: p.commission_type || 'pct', rate_value: p.rate_value ?? 0, status: p.status || 'active' });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!form.company.trim()) return;
    if (editId) await updateMut.mutateAsync({ id: editId, ...form });
    else await insertMut.mutateAsync(form);
    setDialogOpen(false);
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><Handshake className="w-6 h-6 text-primary" />Partners</h1>
          <p className="erp-page-subtitle">{partners.length} partners</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Partner</Button>
      </div>
      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div> : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Commission Type</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Rate / Value</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No partners found.</td></tr>
                ) : partners.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{p.company}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        {p.commission_type === 'pct' ? 'Percentage' : 'Fixed'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {p.commission_type === 'pct' ? `${p.rate_value}%` : `$${p.rate_value?.toLocaleString()}`}
                    </td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={p.status || 'active'} /></td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Partner</AlertDialogTitle><AlertDialogDescription>Delete {p.company}?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(p.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Partner' : 'Add Partner'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label className="text-xs">Company Name *</Label><Input value={form.company} onChange={e => setField('company', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Commission Type</Label>
                <Select value={form.commission_type} onValueChange={v => setField('commission_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pct">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">{form.commission_type === 'pct' ? 'Rate %' : 'Fixed Amount ($)'}</Label>
                <Input type="number" step="0.5" value={form.rate_value} onChange={e => setField('rate_value', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={insertMut.isPending || updateMut.isPending}>{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
