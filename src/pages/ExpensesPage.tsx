import { DollarSign, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { FxLockedBadge } from '@/components/FxLockedBadge';
import { useTableQuery, useInsertMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_FX_RATE, calculateDualAmount, formatUSD, formatIQD } from '@/lib/currency';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ category: 'Office', description: '', amount: 0, currency_input: 'USD', date: new Date().toISOString().split('T')[0], notes: '' });

  const { data: expenses = [], isLoading } = useTableQuery<any>('expenses');
  const insertMut = useInsertMutation('expenses');
  const deleteMut = useDeleteMutation('expenses');

  const filtered = expenses.filter((e: any) =>
    (e.exp_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const fxRate = DEFAULT_FX_RATE;
  const dual = calculateDualAmount(form.amount, form.currency_input as any, fxRate, form.date);

  const handleCreate = async () => {
    if (form.amount <= 0) return;
    const year = new Date().getFullYear();
    const expNo = `EXP-${year}-${String(expenses.length + 1).padStart(4, '0')}`;
    await insertMut.mutateAsync({
      exp_no: expNo, category: form.category, description: form.description,
      amount_usd: dual.amount_usd, amount_iqd: dual.amount_iqd,
      fx_rate: fxRate, fx_date: form.date,
      currency_input: form.currency_input, is_fx_locked: true,
      date: form.date, notes: form.notes, status: 'approved',
    });
    setDialogOpen(false);
    setForm({ category: 'Office', description: '', amount: 0, currency_input: 'USD', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><DollarSign className="w-6 h-6 text-primary" />Expenses</h1>
          <p className="erp-page-subtitle">{expenses.length} expenses — USD | IQD</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Exp #</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">FX</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No expenses recorded.</td></tr>
                ) : filtered.map((e: any) => (
                  <tr key={e.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-primary">{e.exp_no}</td>
                    <td className="px-5 py-3">{e.category}</td>
                    <td className="px-5 py-3 text-muted-foreground">{e.description}</td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={e.amount_usd} iqd={e.amount_iqd} size="sm" /></td>
                    <td className="px-5 py-3 text-muted-foreground">{e.date}</td>
                    <td className="px-5 py-3 text-center">{e.is_fx_locked && <FxLockedBadge />}</td>
                    <td className="px-5 py-3 text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Expense</AlertDialogTitle><AlertDialogDescription>Delete {e.exp_no}?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(e.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setField('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Office">Office</SelectItem><SelectItem value="Travel">Travel</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem><SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem><SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setField('description', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Amount</Label><Input type="number" value={form.amount || ''} onChange={e => setField('amount', parseFloat(e.target.value) || 0)} /></div>
              <div><Label className="text-xs">Currency</Label>
                <Select value={form.currency_input} onValueChange={v => setField('currency_input', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Preview: {formatUSD(dual.amount_usd)} | {formatIQD(dual.amount_iqd)}</p>
            <div><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} /></div>
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
