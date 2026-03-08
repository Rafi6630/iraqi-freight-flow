import { Landmark, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { FxLockedBadge } from '@/components/FxLockedBadge';
import { useTableQuery, useInsertMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DEFAULT_FX_RATE, calculateDualAmount, formatUSD, formatIQD } from '@/lib/currency';

export default function CofounderCapitalPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ cofounder_name: '', amount: 0, currency_input: 'USD', contribution_date: new Date().toISOString().split('T')[0], notes: '' });

  const { data: items = [], isLoading } = useTableQuery<any>('cofounder_capital');
  const insertMut = useInsertMutation('cofounder_capital');
  const deleteMut = useDeleteMutation('cofounder_capital');

  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const fxRate = DEFAULT_FX_RATE;
  const dual = calculateDualAmount(form.amount, form.currency_input as any, fxRate, form.contribution_date);

  const handleCreate = async () => {
    if (!form.cofounder_name.trim() || form.amount <= 0) return;
    await insertMut.mutateAsync({
      cofounder_name: form.cofounder_name,
      contribution_amount_usd: dual.amount_usd,
      contribution_amount_iqd: dual.amount_iqd,
      contribution_date: form.contribution_date,
      fx_rate: fxRate, fx_date: form.contribution_date,
      currency_input: form.currency_input, is_fx_locked: true,
      notes: form.notes,
    });
    setDialogOpen(false);
  };

  const totalUsd = items.reduce((s: number, i: any) => s + (i.contribution_amount_usd || 0), 0);

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><Landmark className="w-6 h-6 text-primary" />Co-Founder Capital</h1>
          <p className="erp-page-subtitle">Track capital contributions — USD | IQD</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Contribution</Button>
      </div>

      {totalUsd > 0 && (
        <div className="erp-metric-card">
          <p className="text-xs text-muted-foreground">Total Capital</p>
          <CurrencyDisplay usd={totalUsd} iqd={totalUsd * DEFAULT_FX_RATE} size="lg" layout="stacked" />
        </div>
      )}

      {isLoading ? <Skeleton className="h-48 w-full" /> : items.length === 0 ? (
        <div className="erp-metric-card text-center py-12 text-muted-foreground">No contributions recorded yet.</div>
      ) : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Co-Founder</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">FX</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i: any) => (
                  <tr key={i.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{i.cofounder_name}</td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={i.contribution_amount_usd} iqd={i.contribution_amount_iqd} size="sm" /></td>
                    <td className="px-5 py-3 text-muted-foreground">{i.contribution_date}</td>
                    <td className="px-5 py-3 text-center">{i.is_fx_locked && <FxLockedBadge />}</td>
                    <td className="px-5 py-3 text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete</AlertDialogTitle><AlertDialogDescription>Delete this contribution?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(i.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
          <DialogHeader><DialogTitle>Add Contribution</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label className="text-xs">Co-Founder Name *</Label><Input value={form.cofounder_name} onChange={e => setField('cofounder_name', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Amount *</Label><Input type="number" value={form.amount || ''} onChange={e => setField('amount', parseFloat(e.target.value) || 0)} /></div>
              <div><Label className="text-xs">Currency</Label>
                <Input value={form.currency_input} onChange={e => setField('currency_input', e.target.value)} placeholder="USD" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Preview: {formatUSD(dual.amount_usd)} | {formatIQD(dual.amount_iqd)}</p>
            <div><Label className="text-xs">Date *</Label><Input type="date" value={form.contribution_date} onChange={e => setField('contribution_date', e.target.value)} /></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e => setField('notes', e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={insertMut.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
