import { ClipboardList, Search, Eye, Check, XCircle, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useTableQuery, useUpdateMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FxLockedBadge } from '@/components/FxLockedBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatUSD, formatIQD } from '@/lib/currency';
import { toast } from 'sonner';

export default function QuotationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewQuotation, setViewQuotation] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [forceZeroTarget, setForceZeroTarget] = useState<any>(null);

  const { data: quotations = [], isLoading } = useTableQuery<any>('quotations');
  const updateMut = useUpdateMutation('quotations');
  const deleteMut = useDeleteMutation('quotations');

  // Fetch services for view details
  const { data: viewServices = [] } = useQuery({
    queryKey: ['quotation_services', viewQuotation?.id],
    queryFn: async () => {
      if (!viewQuotation?.id) return [];
      const { data, error } = await (supabase.from('quotation_services') as any).select('*').eq('quotation_id', viewQuotation.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!viewQuotation?.id,
  });

  const { data: viewPaymentTerms = [] } = useQuery({
    queryKey: ['quotation_payment_terms', viewQuotation?.id],
    queryFn: async () => {
      if (!viewQuotation?.id) return [];
      const { data, error } = await (supabase.from('quotation_payment_terms') as any).select('*').eq('quotation_id', viewQuotation.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!viewQuotation?.id,
  });

  const filtered = quotations.filter((q: any) => {
    const matchesSearch = (q.quote_no || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (q: any) => {
    await updateMut.mutateAsync({ id: q.id, status: 'approved', approved_at: new Date().toISOString() });
    toast.success(`${q.quote_no} marked as approved`);
  };

  const handleForceZero = async () => {
    if (!forceZeroTarget) return;
    await updateMut.mutateAsync({
      id: forceZeroTarget.id,
      status: 'rejected',
      total_usd: 0, total_iqd: 0,
      service_fee_usd: 0, service_fee_iqd: 0,
      margin_pct: 0,
    });
    setForceZeroTarget(null);
    toast.success('Quotation force-zeroed and rejected');
  };

  const handleHardCancel = async () => {
    if (!deleteTarget) return;
    // Delete related services and payment terms first
    await (supabase.from('quotation_services') as any).delete().eq('quotation_id', deleteTarget.id);
    await (supabase.from('quotation_payment_terms') as any).delete().eq('quotation_id', deleteTarget.id);
    deleteMut.mutate(deleteTarget.id);
    setDeleteTarget(null);
    toast.success('Quotation permanently deleted');
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" />Quotations</h1>
          <p className="erp-page-subtitle">{quotations.length} quotations — USD | IQD</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Quote #</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Margin %</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Service Fee</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Validity</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">FX</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">No quotations found.</td></tr>
                ) : filtered.map((q: any) => (
                  <tr key={q.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-primary">{q.quote_no}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={q.status} /></td>
                    <td className="px-5 py-3 text-right font-mono">{q.margin_pct}%</td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={q.service_fee_usd || 0} iqd={q.service_fee_iqd || 0} size="sm" /></td>
                    <td className="px-5 py-3 text-right"><CurrencyDisplay usd={q.total_usd || 0} iqd={q.total_iqd || 0} size="sm" /></td>
                    <td className="px-5 py-3 text-muted-foreground">{q.validity_days} days</td>
                    <td className="px-5 py-3 text-center">{q.is_fx_locked && <FxLockedBadge />}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" title="View Details" onClick={() => setViewQuotation(q)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {q.status !== 'approved' && (
                          <Button variant="ghost" size="sm" title="Mark Approved" onClick={() => handleApprove(q)}>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" title="Force Zero" onClick={() => setForceZeroTarget(q)}>
                          <Ban className="w-3.5 h-3.5 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Hard Cancel (Delete)" onClick={() => setDeleteTarget(q)}>
                          <XCircle className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewQuotation} onOpenChange={v => !v && setViewQuotation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Quotation Details — {viewQuotation?.quote_no}</DialogTitle></DialogHeader>
          {viewQuotation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewQuotation.status} /></div>
                <div><span className="text-muted-foreground">Margin:</span> <span className="font-mono">{viewQuotation.margin_pct}%</span></div>
                <div><span className="text-muted-foreground">Total USD:</span> <span className="font-mono">{formatUSD(viewQuotation.total_usd || 0)}</span></div>
                <div><span className="text-muted-foreground">Total IQD:</span> <span className="font-mono">{formatIQD(viewQuotation.total_iqd || 0)}</span></div>
                <div><span className="text-muted-foreground">Service Fee:</span> <span className="font-mono">{formatUSD(viewQuotation.service_fee_usd || 0)}</span></div>
                <div><span className="text-muted-foreground">Validity:</span> {viewQuotation.validity_days} days</div>
                <div><span className="text-muted-foreground">FX Rate:</span> <span className="font-mono">{viewQuotation.fx_rate}</span></div>
                <div><span className="text-muted-foreground">FX Date:</span> {viewQuotation.fx_date}</div>
                {viewQuotation.quotation_description && (
                  <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {viewQuotation.quotation_description}</div>
                )}
                {viewQuotation.approved_at && (
                  <div className="col-span-2"><span className="text-muted-foreground">Approved at:</span> {new Date(viewQuotation.approved_at).toLocaleString()}</div>
                )}
              </div>

              {viewServices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Services</h4>
                  <div className="erp-table-container">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Service</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Vendor Cost</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Margin %</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Service Fee</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Quoted Price</th>
                      </tr></thead>
                      <tbody>
                        {viewServices.map((s: any) => (
                          <tr key={s.id} className="border-b border-border">
                            <td className="px-3 py-2">{s.service_name}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatUSD(s.vendor_cost_usd || 0)}</td>
                            <td className="px-3 py-2 text-right font-mono">{s.margin_pct}%</td>
                            <td className="px-3 py-2 text-right font-mono">{formatUSD(s.service_fee_usd || 0)}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatUSD(s.quoted_price_usd || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewPaymentTerms.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Payment Terms</h4>
                  <div className="erp-table-container">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">%</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount USD</th>
                      </tr></thead>
                      <tbody>
                        {viewPaymentTerms.map((t: any) => (
                          <tr key={t.id} className="border-b border-border">
                            <td className="px-3 py-2">{t.description || '—'}</td>
                            <td className="px-3 py-2 text-right font-mono">{t.percentage}%</td>
                            <td className="px-3 py-2 text-right font-mono">{formatUSD(t.amount_usd || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hard Cancel (Delete) Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete {deleteTarget?.quote_no}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the quotation, its services, and payment terms. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHardCancel}>Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Zero Confirmation */}
      <AlertDialog open={!!forceZeroTarget} onOpenChange={v => !v && setForceZeroTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Zero {forceZeroTarget?.quote_no}?</AlertDialogTitle>
            <AlertDialogDescription>This will set all amounts to zero and mark the quotation as rejected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceZero}>Force Zero</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
