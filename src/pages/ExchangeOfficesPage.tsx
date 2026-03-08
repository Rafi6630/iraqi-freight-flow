import { ArrowLeftRight, Plus, Eye, History, Search, Calculator, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { useTableQuery, useInsertMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { useState, useMemo } from 'react';
import { formatUSD, formatIQD } from '@/lib/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ExchangeRate {
  id: string; currency_from: string; currency_to: string; exchange_rate: number;
  effective_date: string; status: string; notes: string | null; updated_by: string | null;
  created_at: string | null; updated_at: string | null;
}

interface RateHistory {
  id: string; exchange_rate_id: string; exchange_rate: number; effective_date: string;
  updated_by: string | null; status: string; created_at: string | null;
}

const emptyForm = { currency_from: 'USD', currency_to: 'IQD', exchange_rate: 1310, effective_date: new Date().toISOString().split('T')[0], status: 'Active' as const, notes: '' };

export default function ExchangeOfficesPage() {
  const [search, setSearch] = useState('');
  const [calcAmount, setCalcAmount] = useState('1000');
  const [calcFrom, setCalcFrom] = useState('USD');
  const [calcTo, setCalcTo] = useState('IQD');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [historyRateId, setHistoryRateId] = useState<string | null>(null);

  const { data: rates = [], isLoading } = useTableQuery<ExchangeRate>('exchange_rates', { orderBy: 'effective_date', ascending: false });
  const insertMut = useInsertMutation('exchange_rates');
  const updateMut = useUpdateMutation('exchange_rates');
  const deleteMut = useDeleteMutation('exchange_rates');
  const insertHistoryMut = useInsertMutation('exchange_rate_history');

  const { data: historyData = [] } = useQuery({
    queryKey: ['exchange_rate_history', historyRateId],
    queryFn: async () => {
      if (!historyRateId) return [];
      const { data, error } = await (supabase.from('exchange_rate_history') as any).select('*').eq('exchange_rate_id', historyRateId).order('effective_date', { ascending: true });
      if (error) throw error;
      return data as RateHistory[];
    },
    enabled: !!historyRateId,
  });

  // Get current active rate for calculator
  const activeRate = useMemo(() => {
    const usdIqd = rates.find(r => r.currency_from === 'USD' && r.currency_to === 'IQD' && r.status === 'Active');
    return usdIqd?.exchange_rate || 1310;
  }, [rates]);

  const calcResult = calcFrom === 'USD'
    ? parseFloat(calcAmount || '0') * activeRate
    : parseFloat(calcAmount || '0') / activeRate;

  const filtered = rates.filter(r =>
    `${r.currency_from}/${r.currency_to}`.toLowerCase().includes(search.toLowerCase())
  );

  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (r: ExchangeRate) => {
    setEditId(r.id);
    setForm({ currency_from: r.currency_from, currency_to: r.currency_to, exchange_rate: r.exchange_rate, effective_date: r.effective_date, status: r.status as any, notes: r.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (form.exchange_rate <= 0) return;
    if (editId) {
      // Save history before updating
      const oldRate = rates.find(r => r.id === editId);
      if (oldRate) {
        await insertHistoryMut.mutateAsync({
          exchange_rate_id: editId,
          exchange_rate: oldRate.exchange_rate,
          effective_date: oldRate.effective_date,
          updated_by: oldRate.updated_by,
          status: oldRate.status,
        });
      }
      await updateMut.mutateAsync({ id: editId, ...form, updated_by: 'System' });
    } else {
      await insertMut.mutateAsync({ ...form, updated_by: 'System' });
    }
    setDialogOpen(false);
  };

  const chartData = useMemo(() => {
    return historyData.map(h => ({
      date: h.effective_date,
      rate: h.exchange_rate,
    }));
  }, [historyData]);

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            Exchange Offices
          </h1>
          <p className="erp-page-subtitle">Full exchange rate management</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Rate</Button>
      </div>

      {/* Calculator Widget */}
      <div className="erp-metric-card">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" /> Currency Converter
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <Input type="number" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} className="w-40" />
          <select value={calcFrom} onChange={e => { setCalcFrom(e.target.value); setCalcTo(e.target.value === 'USD' ? 'IQD' : 'USD'); }} className="px-3 py-2 border border-input rounded-md bg-card text-sm">
            <option value="USD">USD</option>
            <option value="IQD">IQD</option>
          </select>
          <span className="text-muted-foreground">→</span>
          <span className="font-mono font-medium text-lg">
            {calcTo === 'IQD' ? formatIQD(calcResult) : formatUSD(calcResult)}
          </span>
          <span className="text-xs text-muted-foreground ml-2">Rate: {activeRate.toLocaleString()}</span>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search rates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div> : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Currency Pair</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Exchange Rate</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Effective Date</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Updated By</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No exchange rates found. Click "Add Rate" to create one.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium">{r.currency_from}/{r.currency_to}</td>
                    <td className="px-5 py-3 text-right font-mono">{r.exchange_rate.toLocaleString()}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.effective_date}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.updated_by || '—'}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setHistoryRateId(r.id)}><History className="w-4 h-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Rate</AlertDialogTitle><AlertDialogDescription>Delete {r.currency_from}/{r.currency_to} rate?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(r.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Exchange Rate' : 'Add Exchange Rate'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Currency From</Label>
                <Select value={form.currency_from} onValueChange={v => setField('currency_from', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem><SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Currency To</Label>
                <Select value={form.currency_to} onValueChange={v => setField('currency_to', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IQD">IQD</SelectItem><SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Exchange Rate *</Label><Input type="number" step="0.01" value={form.exchange_rate} onChange={e => setField('exchange_rate', parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Effective Date *</Label><Input type="date" value={form.effective_date} onChange={e => setField('effective_date', e.target.value)} /></div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={insertMut.isPending || updateMut.isPending}>{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={!!historyRateId} onOpenChange={() => setHistoryRateId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Rate History</DialogTitle></DialogHeader>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No history records yet. Edit the rate to start tracking changes.</p>
          )}
          {historyData.length > 0 && (
            <div className="erp-table-container max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Rate</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Updated By</th>
                </tr></thead>
                <tbody>
                  {historyData.map(h => (
                    <tr key={h.id} className="border-b border-border">
                      <td className="px-4 py-2">{h.effective_date}</td>
                      <td className="px-4 py-2 text-right font-mono">{h.exchange_rate.toLocaleString()}</td>
                      <td className="px-4 py-2 text-muted-foreground">{h.updated_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
