import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, TrendingUp, TrendingDown, DollarSign, Users, Trash2, Landmark } from 'lucide-react';
import { useTableQuery, useInsertMutation } from '@/hooks/use-supabase-query';
import { DEFAULT_FX_RATE } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function CurrencyDisplay({ usd, iqd }: { usd: number; iqd: number }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-sm">${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      <span className="text-xs text-muted-foreground font-mono">{iqd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} IQD</span>
    </div>
  );
}

const emptyFF = { name: '', ownership_pct: 0, notes: '' };
const emptyTF = { founder_id: '', transaction_date: new Date().toISOString().split('T')[0], type: 'contribution', amount_usd: 0, notes: '' };

export default function CofounderCapitalPage() {
  const queryClient = useQueryClient();
  const { data: founders = [],     isLoading: fLoad } = useTableQuery<any>('cofounders',             { orderBy: 'created_at', ascending: true });
  const { data: transactions = [], isLoading: tLoad } = useTableQuery<any>('cofounder_transactions', { orderBy: 'transaction_date', ascending: false });
  const insertFounder = useInsertMutation('cofounders');
  const insertTxn     = useInsertMutation('cofounder_transactions');

  const [founderOpen, setFounderOpen] = useState(false);
  const [txnOpen,     setTxnOpen]     = useState(false);
  const [founderForm, setFounderForm] = useState(emptyFF);
  const [txnForm,     setTxnForm]     = useState(emptyTF);
  const [fxRate,      setFxRate]      = useState<number>(DEFAULT_FX_RATE);

  const setFF = (k: string, v: any) => setFounderForm(p => ({ ...p, [k]: v }));
  const setTF = (k: string, v: any) => setTxnForm(p => ({ ...p, [k]: v }));

  const plSummary = useMemo(() => founders.map((f: any) => {
    const ft = transactions.filter((t: any) => t.founder_id === f.id);
    const c_usd = ft.filter((t: any) => t.type === 'contribution').reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
    const p_usd = ft.filter((t: any) => t.type === 'profit_allocation').reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
    const w_usd = ft.filter((t: any) => t.type === 'withdrawal').reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
    const c_iqd = ft.filter((t: any) => t.type === 'contribution').reduce((s: number, t: any) => s + (t.amount_iqd || 0), 0);
    const p_iqd = ft.filter((t: any) => t.type === 'profit_allocation').reduce((s: number, t: any) => s + (t.amount_iqd || 0), 0);
    const w_iqd = ft.filter((t: any) => t.type === 'withdrawal').reduce((s: number, t: any) => s + (t.amount_iqd || 0), 0);
    const net_usd = c_usd + p_usd - w_usd;
    const net_iqd = c_iqd + p_iqd - w_iqd;
    const roi_pct = c_usd > 0 ? ((net_usd - c_usd) / c_usd) * 100 : 0;
    return { id: f.id, name: f.name, ownership_pct: f.ownership_pct, c_usd, p_usd, w_usd, c_iqd, p_iqd, w_iqd, net_usd, net_iqd, roi_pct };
  }), [founders, transactions]);

  const totalOwnership   = founders.reduce((s: number, f: any) => s + (f.ownership_pct || 0), 0);
  const totalContrib     = plSummary.reduce((s, p) => s + p.c_usd, 0);
  const totalProfitShare = plSummary.reduce((s, p) => s + p.p_usd, 0);
  const totalWithdrawals = plSummary.reduce((s, p) => s + p.w_usd, 0);
  const totalEquity      = plSummary.reduce((s, p) => s + p.net_usd, 0);

  const handleAddFounder = async () => {
    if (!founderForm.name.trim()) return;
    await insertFounder.mutateAsync({ ...founderForm, ownership_pct: Number(founderForm.ownership_pct) });
    toast.success('Co-founder added');
    setFounderForm(emptyFF);
    setFounderOpen(false);
  };

  const handleAddTxn = async () => {
    if (!txnForm.founder_id || Number(txnForm.amount_usd) <= 0) return;
    await insertTxn.mutateAsync({ ...txnForm, amount_usd: Number(txnForm.amount_usd), amount_iqd: Math.round(Number(txnForm.amount_usd) * fxRate), fx_rate: fxRate });
    toast.success('Transaction recorded');
    setTxnForm(emptyTF);
    setTxnOpen(false);
  };

  const delFounder = async (id: string) => {
    await (supabase.from('cofounders') as any).delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['cofounders'] });
    toast.success('Co-founder deleted');
  };

  const delTxn = async (id: string) => {
    await (supabase.from('cofounder_transactions') as any).delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['cofounder_transactions'] });
    toast.success('Transaction deleted');
  };

  const isLoading = fLoad || tLoad;
  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="w-7 h-7 text-primary" /> Co-Founder Equity &amp; P&amp;L
          </h2>
          <p className="text-muted-foreground">Manage founder equity, contributions, and profit distribution</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">💱 FX Rate:</span>
            <Input type="number" value={fxRate} onChange={e => setFxRate(parseFloat(e.target.value) || DEFAULT_FX_RATE)} className="w-24 h-7 text-xs font-mono" />
            <span className="text-xs text-amber-600">IQD/USD</span>
          </div>
          <Button onClick={() => setFounderOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Co-Founder</Button>
          <Button variant="outline" onClick={() => setTxnOpen(true)}><Plus className="h-4 w-4 mr-2" /> Record Transaction</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Contributions', val: totalContrib,     icon: TrendingUp,   color: 'text-green-600',  sub: 'Capital invested' },
          { label: 'Total Profit Share',  val: totalProfitShare, icon: DollarSign,   color: 'text-primary',    sub: 'Distributed profits' },
          { label: 'Total Withdrawals',   val: totalWithdrawals, icon: TrendingDown, color: 'text-red-600',    sub: 'Money withdrawn' },
          { label: 'Total Equity',        val: totalEquity,      icon: Users,        color: totalEquity >= 0 ? 'text-emerald-600' : 'text-destructive', sub: 'Net company equity' },
        ].map(c => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-mono ${c.color}`}>{fmt(c.val)}</div>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">P&amp;L Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Ledger</TabsTrigger>
          <TabsTrigger value="founders">Co-Founders</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader><CardTitle>Co-Founder P&amp;L Dashboard</CardTitle><CardDescription>Current equity position for each co-founder</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Founder</TableHead><TableHead>Ownership %</TableHead><TableHead>Contributions</TableHead>
                        <TableHead>Profit Share</TableHead><TableHead>Withdrawals</TableHead><TableHead>Net Account Value</TableHead><TableHead>ROI %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plSummary.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell><Badge variant="outline">{s.ownership_pct}%</Badge></TableCell>
                          <TableCell><CurrencyDisplay usd={s.c_usd} iqd={s.c_iqd} /></TableCell>
                          <TableCell><CurrencyDisplay usd={s.p_usd} iqd={s.p_iqd} /></TableCell>
                          <TableCell><CurrencyDisplay usd={s.w_usd} iqd={s.w_iqd} /></TableCell>
                          <TableCell><CurrencyDisplay usd={s.net_usd} iqd={s.net_iqd} /></TableCell>
                          <TableCell><Badge variant={s.roi_pct > 0 ? 'default' : 'secondary'}>{s.roi_pct.toFixed(2)}%</Badge></TableCell>
                        </TableRow>
                      ))}
                      {plSummary.length > 0 && (
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>TOTAL</TableCell>
                          <TableCell><Badge variant={totalOwnership === 100 ? 'default' : 'destructive'}>{totalOwnership}%</Badge></TableCell>
                          <TableCell className="font-mono">{fmt(totalContrib)}</TableCell>
                          <TableCell className="font-mono">{fmt(totalProfitShare)}</TableCell>
                          <TableCell className="font-mono">{fmt(totalWithdrawals)}</TableCell>
                          <TableCell className="font-mono">{fmt(totalEquity)}</TableCell>
                          <TableCell>—</TableCell>
                        </TableRow>
                      )}
                      {plSummary.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No co-founders yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {totalOwnership !== 100 && founders.length > 0 && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 font-medium">⚠️ Total ownership is {totalOwnership}%. It should equal 100%.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle>Transaction Ledger</CardTitle><CardDescription>Chronological record of all founder transactions</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>Founder</TableHead><TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead><TableHead>FX Rate</TableHead><TableHead>Notes</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn: any) => {
                      const founder = founders.find((f: any) => f.id === txn.founder_id);
                      return (
                        <TableRow key={txn.id}>
                          <TableCell>{new Date(txn.transaction_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{founder?.name || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={txn.type === 'contribution' ? 'default' : txn.type === 'withdrawal' ? 'destructive' : 'secondary'}>
                              {txn.type === 'contribution' ? '💰 Contribution' : txn.type === 'withdrawal' ? '💸 Withdrawal' : '📈 Profit Allocation'}
                            </Badge>
                          </TableCell>
                          <TableCell><CurrencyDisplay usd={txn.amount_usd} iqd={txn.amount_iqd} /></TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{txn.fx_rate?.toLocaleString()}</TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">{txn.notes || '—'}</TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>Delete this {txn.type} of ${txn.amount_usd}?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => delTxn(txn.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {transactions.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transactions yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="founders">
          <Card>
            <CardHeader><CardTitle>Co-Founders</CardTitle><CardDescription>Manage co-founder list and ownership percentages</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead><TableHead>Ownership %</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {founders.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell><Badge variant="outline">{f.ownership_pct}%</Badge></TableCell>
                        <TableCell><Badge variant={f.status === 'active' ? 'default' : 'secondary'}>{f.status}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{f.notes || '—'}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Co-Founder</AlertDialogTitle>
                                <AlertDialogDescription>Delete {f.name}? All transactions will also be deleted.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => delFounder(f.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {founders.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No co-founders yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Co-Founder Dialog */}
      <Dialog open={founderOpen} onOpenChange={setFounderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Co-Founder</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs">Name *</Label><Input value={founderForm.name} onChange={e => setFF('name', e.target.value)} placeholder="Founder name" /></div>
            <div>
              <Label className="text-xs">Ownership % *</Label>
              <Input type="number" step="0.01" min="0" max="100" value={founderForm.ownership_pct} onChange={e => setFF('ownership_pct', parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-1">Must total 100%. Current total: {totalOwnership}%</p>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={founderForm.notes} onChange={e => setFF('notes', e.target.value)} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFounderOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFounder} disabled={insertFounder.isPending || !founderForm.name.trim()}>Add Co-Founder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Transaction Dialog */}
      <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Co-Founder *</Label>
              <Select value={txnForm.founder_id} onValueChange={v => setTF('founder_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select founder" /></SelectTrigger>
                <SelectContent>{founders.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name} ({f.ownership_pct}%)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Date *</Label><Input type="date" value={txnForm.transaction_date} onChange={e => setTF('transaction_date', e.target.value)} /></div>
            <div>
              <Label className="text-xs">Type *</Label>
              <Select value={txnForm.type} onValueChange={v => setTF('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribution">💰 Contribution (Money In)</SelectItem>
                  <SelectItem value="withdrawal">💸 Withdrawal (Money Out)</SelectItem>
                  <SelectItem value="profit_allocation">📈 Profit Allocation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount USD *</Label>
                <Input type="number" step="0.01" min="0" value={txnForm.amount_usd} onChange={e => setTF('amount_usd', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Amount IQD (auto)</Label>
                <Input type="number" readOnly value={Math.round(Number(txnForm.amount_usd) * fxRate)} className="bg-muted/50 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground mt-0.5">@ {fxRate.toLocaleString()} IQD/USD</p>
              </div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={txnForm.notes} onChange={e => setTF('notes', e.target.value)} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTxnOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTxn} disabled={insertTxn.isPending || !txnForm.founder_id || Number(txnForm.amount_usd) <= 0}>Record Transaction</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
