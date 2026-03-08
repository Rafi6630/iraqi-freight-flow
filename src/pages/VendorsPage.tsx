import { Truck, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { useTableQuery, useInsertMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

interface Vendor {
  id: string; company: string; type: string | null; phone: string | null;
  email: string | null; city: string | null; payment_terms_days: number | null;
  rating: number | null; notes: string | null; created_at: string | null;
}

const emptyForm = { company: '', type: 'carrier', phone: '', email: '', city: '', payment_terms_days: 30, rating: 3, notes: '' };

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: vendors = [], isLoading } = useTableQuery<Vendor>('vendors');
  const insertMut = useInsertMutation('vendors');
  const updateMut = useUpdateMutation('vendors');
  const deleteMut = useDeleteMutation('vendors');

  const filtered = vendors.filter(v => (v.company || '').toLowerCase().includes(search.toLowerCase()));
  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (v: Vendor) => {
    setEditId(v.id);
    setForm({ company: v.company, type: v.type || 'carrier', phone: v.phone || '', email: v.email || '', city: v.city || '', payment_terms_days: v.payment_terms_days ?? 30, rating: v.rating ?? 3, notes: v.notes || '' });
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
          <h1 className="erp-page-title flex items-center gap-2"><Truck className="w-6 h-6 text-primary" />Vendors</h1>
          <p className="erp-page-subtitle">{vendors.length} vendors registered</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Vendor</Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>
      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div> : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">City</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Rating</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No vendors found.</td></tr>
                ) : filtered.map(v => (
                  <tr key={v.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{v.company}</td>
                    <td className="px-5 py-3"><StatusBadge status={v.type || ''} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{v.city}</td>
                    <td className="px-5 py-3"><div className="text-xs text-muted-foreground">{v.email}</div><div className="text-xs text-muted-foreground">{v.phone}</div></td>
                    <td className="px-5 py-3 text-center"><span className="font-mono font-medium">{v.rating}</span><span className="text-muted-foreground">/5</span></td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(v)}><Edit className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Vendor</AlertDialogTitle><AlertDialogDescription>Delete {v.company}?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(v.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label className="text-xs">Company Name *</Label><Input value={form.company} onChange={e => setField('company', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setField('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carrier">Carrier</SelectItem>
                    <SelectItem value="customs">Customs</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setField('city', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setField('email', e.target.value)} /></div>
              <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setField('phone', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Payment Terms</Label><Input type="number" value={form.payment_terms_days} onChange={e => setField('payment_terms_days', parseInt(e.target.value) || 0)} /></div>
              <div><Label className="text-xs">Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={e => setField('rating', parseInt(e.target.value) || 3)} /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} /></div>
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
