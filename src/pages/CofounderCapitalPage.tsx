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
import { Plus, TrendingUp, TrendingDown, DollarSign, Users, Trash2, Landmark, RefreshCw, PieChart as PieIcon, Wallet } from 'lucide-react';
import { useTableQuery, useInsertMutation } from '@/hooks/use-supabase-query';
import { DEFAULT_FX_RATE } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── dual-currency display ──────────────────────────────────────────────────
function Dual({ usd, iqd }: { usd: number; iqd: number }) {
  return (
    <div>
      <p className="font-mono text-sm">${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p className="text-xs text-muted-foreground font-mono">{iqd.toLocaleString('en-US', { maximumFractionDigits: 0 })} IQD</p>
    </div>
  );
}

// ─── small metric card ──────────────────────────────────────────────────────
function KPI({ label, value, sub, color = '', icon: Icon }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const emptyFF = { name: '', ownership_pct: 0, notes: '' };
const emptyTF = { founder_id: '', transaction_date: new Date().toISOString().split('T')[0], type: 'contribution', amount_usd: 0, notes: '' };

export default function CofounderCapitalPage() {
  const queryClient = useQueryClient();

  // ─── financial data for real-time profit calculation ───────────────────────
  const { data: founders    = [], isLoading: fLoad } = useTableQuery<any>('cofounders',             { orderBy: 'created_at', ascending: true });
  const { data: transactions= [], isLoading: tLoad } = useTableQuery<any>('cofounder_transactions', { orderBy: 'transaction_date', ascending: false });
  const { data: invoices    = [] }                   = useTableQuery<any>('invoices');
  const { data: orderCosts  = [] }                   = useTableQuery<any>('order_costs');
  const { data: expenses    = [] }                   = useTableQuery<any>('expenses');
  const { data: payments    = [] }                   = useTableQuery<any>('payments');

  const insertFounder = useInsertMutation('cofounders');
  const insertTxn     = useInsertMutation('cofounder_transactions');

  const [founderOpen, setFounderOpen] = useState(false);
  const [txnOpen,     setTxnOpen]     = useState(false);
  const [founderForm, setFounderForm] = useState(emptyFF);
  const [txnForm,     setTxnForm]     = useState({ ...emptyTF });
  const [fxRate,      setFxRate]      = useState<number>(DEFAULT_FX_RATE);
  const [distOpen,    setDistOpen]    = useState(false);
  const [distForm,    setDistForm]    = useState({ founder_id: '', amount_usd: 0, notes: '' });

  const setFF = (k: string, v: any) => setFounderForm(p => ({ ...p, [k]: v }));
  const setTF = (k: string, v: any) => setTxnForm(p => ({ ...p, [k]: v }));
  const setDF = (k: string, v: any) => setDistForm(p => ({ ...p, [k]: v }));

  // ─── REAL-TIME company net profit from actual data ──────────────────────────
  const companyNetProfit = useMemo(() => {
    const revenue      = invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
    const vendorCosts  = orderCosts
      .filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive')
      .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
    const commissions  = orderCosts
      .filter((c: any) => c.category === 'partner_commission' || c.category === 'employee_incentive')
      .reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
    const expensesAmt  = expenses.reduce((s: number, e: any) => s + (e.amount_usd || 0), 0);
    const paymentFees  = payments.reduce((s: number, p: any) => s + (p.payment_fee_usd || 0), 0);
    const fxGainLoss   = payments.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);
    return revenue - vendorCosts - commissions - expensesAmt - paymentFees + fxGainLoss;
  }, [invoices, orderCosts, expenses, payments]);

  // ─── per-founder P&L summary ────────────────────────────────────────────────
  const plSummary = useMemo(() => {
    return founders.map((f: any) => {
      const ft = transactions.filter((t: any) => t.founder_id === f.id);

      // Capital: what the founder has put in
      const capitalIn    = ft.filter((t: any) => t.type === 'contribution')
                             .reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
      const capitalIn_iq = ft.filter((t: any) => t.type === 'contribution')
                             .reduce((s: number, t: any) => s + (t.amount_iqd || 0), 0);

      // What they've taken out as capital withdrawals (not profit)
      const capitalOut    = ft.filter((t: any) => t.type === 'withdrawal')
                              .reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
      const capitalOut_iq = ft.filter((t: any) => t.type === 'withdrawal')
                              .reduce((s: number, t: any) => s + (t.amount_iqd || 0), 0);

      // Profit already distributed/paid out to this founder
      const distributed    = ft.filter((t: any) => t.type === 'profit_allocation')
                               .reduce((s: number, t: any) => s + (t.amount_usd || 0), 0);
      const distributed_iq = ft.filter((t: any) => t.type === 'profit_allocation')
                               .reduce((s: number, t: any) => s + (t.amount_iqd || 0), 0);

      // Real-time profit share = company net profit × ownership %
      const ownershipPct   = f.ownership_pct || 0;
      const profitShare    = companyNetProfit * (ownershipPct / 100);
      const profitShare_iq = Math.round(profitShare * fxRate);

      // Available to distribute = earned share − already distributed
      const availableToDist    = profitShare - distributed;
      const availableToDist_iq = Math.round(availableToDist * fxRate);

      // Fund balance = capital invested still in company
      const fundBalance    = capitalIn - capitalOut;
      const fundBalance_iq = capitalIn_iq - capitalOut_iq;

      const roi_pct = capitalIn > 0 ? ((profitShare - distributed) / capitalIn) * 100 : 0;

      return {
        id: f.id, name: f.name, ownership_pct: ownershipPct,
        capitalIn, capitalIn_iq, capitalOut, capitalOut_iq,
        fundBalance, fundBalance_iq,
        profitShare, profitShare_iq,
        distributed, distributed_iq,
        availableToDist, availableToDist_iq,
        roi_pct,
      };
    });
  }, [founders, transactions, companyNetProfit, fxRate]);

  // ─── totals ─────────────────────────────────────────────────────────────────
  const totalOwnership        = founders.reduce((s: number, f: any) => s + (f.ownership_pct || 0), 0);
  const totalCapital          = plSummary.reduce((s, p) => s + p.capitalIn, 0);
  const totalFundBalance      = plSummary.reduce((s, p) => s + p.fundBalance, 0);
  const totalDistributed      = plSummary.reduce((s, p) => s + p.distributed, 0);
  const totalAvailableToDist  = plSummary.reduce((s, p) => s + p.availableToDist, 0);

  // ─── handlers ────────────────────────────────────────────────────────────────
  const handleAddFounder = async () => {
    if (!founderForm.name.trim()) return;
    await insertFounder.mutateAsync({ ...founderForm, ownership_pct: Number(founderForm.ownership_pct) });
    toast.success('Co-founder added');
    setFounderForm(emptyFF);
    setFounderOpen(false);
  };

  const handleAddTxn = async () => {
    if (!txnForm.founder_id || Number(txnForm.amount_usd) <= 0) return;
    await insertTxn.mutateAsync({
      ...txnForm,
      amount_usd: Number(txnForm.amount_usd),
      amount_iqd: Math.round(Number(txnForm.amount_usd) * fxRate),
      fx_rate: fxRate,
    });
    toast.success('Transaction recorded');
    setTxnForm({ ...emptyTF });
    setTxnOpen(false);
  };

  const handleDistribute = async () => {
    if (!distForm.founder_id || Number(distForm.amount_usd) <= 0) return;
    const founder = founders.find((f: any) => f.id === distForm.founder_id);
    const summary = plSummary.find(p => p.id === distForm.founder_id);
    if (summary && Number(distForm.amount_usd) > summary.availableToDist) {
      toast.error(`Amount exceeds available profit share ($${summary.availableToDist.toFixed(2)})`);
      return;
    }
    await insertTxn.mutateAsync({
      founder_id: distForm.founder_id,
      transaction_date: new Date().toISOString().split('T')[0],
      type: 'profit_allocation',
      amount_usd: Number(distForm.amount_usd),
      amount_iqd: Math.round(Number(distForm.amount_usd) * fxRate),
      fx_rate: fxRate,
      notes: distForm.notes || `Profit distribution — ${founder?.name}`,
    });
    toast.success('Profit distribution recorded');
    setDistForm({ founder_id: '', amount_usd: 0, notes: '' });
    setDistOpen(false);
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
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 p-1">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="w-7 h-7 text-primary" /> Co-Founder Equity &amp; P&amp;L
          </h2>
          <p className="text-muted-foreground">Real-time profit share · capital tracking · distributions</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Manual FX rate — no exchange_rates table needed */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">💱 FX:</span>
            <Input type="number" value={fxRate}
              onChange={e => setFxRate(parseFloat(e.target.value) || DEFAULT_FX_RATE)}
              className="w-24 h-7 text-xs font-mono" />
            <span className="text-xs text-amber-600">IQD/USD</span>
          </div>
          <Button variant="outline" onClick={() => setDistOpen(true)}>
            <DollarSign className="h-4 w-4 mr-2" /> Distribute Profit
          </Button>
          <Button variant="outline" onClick={() => { setTxnForm({ ...emptyTF }); setTxnOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Capital / Withdrawal
          </Button>
          <Button onClick={() => setFounderOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Co-Founder
          </Button>
        </div>
      </div>

      {/* ─── Company Net Profit Banner ─── */}
      <div className={`p-4 rounded-lg border-2 ${companyNetProfit >= 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <RefreshCw className={`w-5 h-5 ${companyNetProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Real-Time Company Net Profit</p>
              <p className={`text-3xl font-bold font-mono ${companyNetProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {fmt(companyNetProfit)}
              </p>
              <p className="text-sm text-muted-foreground">{(companyNetProfit * fxRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} IQD · Live from invoices − costs − expenses − fees ± FX</p>
            </div>
          </div>
          <div className="md:ml-auto flex gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Distributed</p>
              <p className="font-mono font-semibold text-amber-600">{fmt(totalDistributed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available to Distribute</p>
              <p className={`font-mono font-semibold ${totalAvailableToDist >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(totalAvailableToDist)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Capital in Fund</p>
              <p className="font-mono font-semibold text-blue-600">{fmt(totalFundBalance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Total Capital Invested" value={fmt(totalCapital)}     sub="All contributions"         icon={TrendingUp}  color="text-blue-600" />
        <KPI label="Capital in Fund"         value={fmt(totalFundBalance)} sub="Invested − withdrawals"    icon={Wallet}      color="text-indigo-600" />
        <KPI label="Total Profit Distributed" value={fmt(totalDistributed)} sub="Paid out to founders"     icon={DollarSign}  color="text-amber-600" />
        <KPI label="Profit Available"          value={fmt(totalAvailableToDist)}
          sub={totalAvailableToDist >= 0 ? 'Ready to distribute' : 'Company in loss'}
          icon={PieIcon}
          color={totalAvailableToDist >= 0 ? 'text-emerald-600' : 'text-red-500'} />
      </div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="dashboard">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">P&amp;L Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Ledger</TabsTrigger>
          <TabsTrigger value="founders">Co-Founders</TabsTrigger>
        </TabsList>

        {/* ── P&L Dashboard ── */}
        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Co-Founder P&amp;L Dashboard</CardTitle>
              <CardDescription>
                Profit share is computed in real-time: Company Net Profit × Ownership %. Distributed = profit already paid out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Founder</TableHead>
                        <TableHead className="text-right">Ownership</TableHead>
                        <TableHead className="text-right">Profit Share (Live)</TableHead>
                        <TableHead className="text-right">Distributed</TableHead>
                        <TableHead className="text-right">Available to Dist.</TableHead>
                        <TableHead className="text-right">Capital in Fund</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plSummary.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right"><Badge variant="outline">{s.ownership_pct}%</Badge></TableCell>
                          <TableCell className="text-right">
                            <Dual usd={s.profitShare} iqd={s.profitShare_iq} />
                          </TableCell>
                          <TableCell className="text-right text-amber-600">
                            <Dual usd={s.distributed} iqd={s.distributed_iq} />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-mono font-semibold text-sm ${s.availableToDist >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {fmt(s.availableToDist)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            <Dual usd={s.fundBalance} iqd={s.fundBalance_iq} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={s.roi_pct > 0 ? 'default' : 'secondary'}>{s.roi_pct.toFixed(1)}%</Badge>
                          </TableCell>
                          <TableCell>
                            {s.availableToDist > 0 && (
                              <Button size="sm" variant="outline" className="text-xs"
                                onClick={() => { setDistForm({ founder_id: s.id, amount_usd: parseFloat(s.availableToDist.toFixed(2)), notes: '' }); setDistOpen(true); }}>
                                Distribute
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {plSummary.length > 0 && (
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={totalOwnership === 100 ? 'default' : 'destructive'}>{totalOwnership}%</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmt(companyNetProfit)}</TableCell>
                          <TableCell className="text-right font-mono text-amber-600">{fmt(totalDistributed)}</TableCell>
                          <TableCell className={`text-right font-mono ${totalAvailableToDist >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(totalAvailableToDist)}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">{fmt(totalFundBalance)}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      )}
                      {plSummary.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No co-founders yet. Click "Add Co-Founder" to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {totalOwnership !== 100 && founders.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 font-medium">⚠️ Total ownership is {totalOwnership}% — must equal 100%.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Transaction Ledger ── */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Ledger</CardTitle>
              <CardDescription>All capital contributions, withdrawals, and profit distributions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Founder</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">FX Rate</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn: any) => {
                      const f = founders.find((f: any) => f.id === txn.founder_id);
                      return (
                        <TableRow key={txn.id}>
                          <TableCell className="text-sm">{new Date(txn.transaction_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{f?.name || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={txn.type === 'contribution' ? 'default' : txn.type === 'withdrawal' ? 'destructive' : 'secondary'}>
                              {txn.type === 'contribution' ? '💰 Capital In' : txn.type === 'withdrawal' ? '💸 Capital Out' : '📈 Profit Distribution'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right"><Dual usd={txn.amount_usd} iqd={txn.amount_iqd} /></TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{txn.fx_rate?.toLocaleString()}</TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{txn.notes || '—'}</TableCell>
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
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No transactions yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Co-Founders ── */}
        <TabsContent value="founders">
          <Card>
            <CardHeader>
              <CardTitle>Co-Founders</CardTitle>
              <CardDescription>Manage ownership percentages. Total must equal 100%.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Ownership %</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
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
                                <AlertDialogDescription>Delete {f.name}? All their transactions will also be deleted.</AlertDialogDescription>
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
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No co-founders yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Add Co-Founder Dialog ─── */}
      <Dialog open={founderOpen} onOpenChange={setFounderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Co-Founder</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs">Name *</Label><Input value={founderForm.name} onChange={e => setFF('name', e.target.value)} /></div>
            <div>
              <Label className="text-xs">Ownership % *</Label>
              <Input type="number" step="0.01" min="0" max="100"
                value={founderForm.ownership_pct} onChange={e => setFF('ownership_pct', parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-1">Current total: {totalOwnership}% — after adding: {(totalOwnership + Number(founderForm.ownership_pct)).toFixed(2)}%</p>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={founderForm.notes} onChange={e => setFF('notes', e.target.value)} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFounderOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFounder} disabled={insertFounder.isPending || !founderForm.name.trim()}>Add Co-Founder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Add Capital / Withdrawal Dialog ─── */}
      <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Capital Transaction</DialogTitle></DialogHeader>
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
                  <SelectItem value="contribution">💰 Capital In (top-up / contribution)</SelectItem>
                  <SelectItem value="withdrawal">💸 Capital Out (withdrawal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount USD *</Label>
                <Input type="number" step="0.01" min="0" value={txnForm.amount_usd}
                  onChange={e => setTF('amount_usd', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Amount IQD (auto)</Label>
                <Input type="number" readOnly value={Math.round(Number(txnForm.amount_usd) * fxRate)} className="bg-muted/50" />
                <p className="text-xs text-muted-foreground mt-0.5">@ {fxRate.toLocaleString()} IQD/USD</p>
              </div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={txnForm.notes} onChange={e => setTF('notes', e.target.value)} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTxnOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTxn} disabled={insertTxn.isPending || !txnForm.founder_id || Number(txnForm.amount_usd) <= 0}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Distribute Profit Dialog ─── */}
      <Dialog open={distOpen} onOpenChange={setDistOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>💰 Distribute Profit</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p className="text-muted-foreground text-xs mb-1">Company Net Profit (Live)</p>
              <p className={`font-mono font-bold text-lg ${companyNetProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(companyNetProfit)}</p>
            </div>
            <div>
              <Label className="text-xs">Co-Founder *</Label>
              <Select value={distForm.founder_id} onValueChange={v => {
                setDF('founder_id', v);
                const s = plSummary.find(p => p.id === v);
                if (s) setDF('amount_usd', parseFloat(s.availableToDist.toFixed(2)));
              }}>
                <SelectTrigger><SelectValue placeholder="Select founder" /></SelectTrigger>
                <SelectContent>
                  {plSummary.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — Available: {fmt(s.availableToDist)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {distForm.founder_id && (() => {
                const s = plSummary.find(p => p.id === distForm.founder_id);
                return s ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Profit share: {fmt(s.profitShare)} · Distributed: {fmt(s.distributed)} · <span className="text-emerald-600 font-medium">Available: {fmt(s.availableToDist)}</span>
                  </p>
                ) : null;
              })()}
            </div>
            <div>
              <Label className="text-xs">Amount USD *</Label>
              <Input type="number" step="0.01" min="0" value={distForm.amount_usd}
                onChange={e => setDF('amount_usd', parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-0.5">IQD: {Math.round(Number(distForm.amount_usd) * fxRate).toLocaleString()}</p>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={distForm.notes} onChange={e => setDF('notes', e.target.value)} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDistOpen(false)}>Cancel</Button>
            <Button onClick={handleDistribute}
              disabled={insertTxn.isPending || !distForm.founder_id || Number(distForm.amount_usd) <= 0}>
              Record Distribution
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
