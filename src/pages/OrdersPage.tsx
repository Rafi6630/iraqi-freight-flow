import { Package, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useTableQuery, useInsertMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { nextDocNumber } from '@/lib/docNumbers';

const countryCityMap: Record<string, string[]> = {
  'Iraq': ['Baghdad', 'Basra', 'Erbil', 'Sulaymaniyah', 'Mosul', 'Najaf', 'Karbala', 'Kirkuk', 'Duhok', 'Umm Qasr'],
  'China': ['Shanghai', 'Shenzhen', 'Guangzhou', 'Ningbo', 'Qingdao', 'Tianjin', 'Xiamen', 'Dalian', 'Beijing', 'Hong Kong'],
  'Turkey': ['Istanbul', 'Mersin', 'Izmir', 'Ankara', 'Trabzon', 'Iskenderun'],
  'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Jebel Ali', 'Fujairah'],
  'India': ['Mumbai', 'Chennai', 'Nhava Sheva', 'Kolkata', 'Delhi', 'Mundra'],
  'Saudi Arabia': ['Jeddah', 'Riyadh', 'Dammam', 'Jubail'],
  'Iran': ['Tehran', 'Bandar Abbas', 'Isfahan', 'Bushehr'],
  'Jordan': ['Amman', 'Aqaba'],
  'Kuwait': ['Kuwait City', 'Shuwaikh'],
  'Oman': ['Muscat', 'Sohar', 'Salalah'],
  'Bahrain': ['Manama'],
  'Qatar': ['Doha'],
  'Egypt': ['Cairo', 'Alexandria', 'Port Said', 'Suez'],
  'Germany': ['Hamburg', 'Bremen', 'Frankfurt', 'Munich', 'Berlin'],
  'Netherlands': ['Rotterdam', 'Amsterdam'],
  'United Kingdom': ['London', 'Felixstowe', 'Southampton', 'Liverpool'],
  'United States': ['New York', 'Los Angeles', 'Houston', 'Miami', 'Chicago', 'Savannah'],
  'South Korea': ['Busan', 'Seoul', 'Incheon'],
  'Japan': ['Tokyo', 'Yokohama', 'Osaka', 'Kobe'],
  'Malaysia': ['Port Klang', 'Kuala Lumpur', 'Penang'],
  'Singapore': ['Singapore'],
  'Pakistan': ['Karachi', 'Lahore', 'Islamabad'],
  'Lebanon': ['Beirut', 'Tripoli'],
  'Syria': ['Damascus', 'Latakia'],
};

const stepLabels: Record<number, string> = {
  1: 'Setup', 2: 'Shipment', 3: 'Cost Sheet', 4: 'Quotation', 5: 'Approval',
  6: 'Execution', 7: 'Invoice', 8: 'Payment', 9: 'Closed',
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useTableQuery<any>('orders');
  const { data: customers = [] } = useTableQuery<any>('customers');
  const { data: employees = [] } = useTableQuery<any>('employees');
  const insertMut = useInsertMutation('orders');

  const [form, setForm] = useState({
    customer_id: '', mode: 'sea' as const, direction: 'import' as const,
    origin_country: '', origin_city: '', destination_country: '', destination_city: '',
    responsible_employee_id: '',
  });

  const filtered = orders.filter((o: any) =>
    (o.order_no || '').toLowerCase().includes(search.toLowerCase())
  );

  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.customer_id || !form.origin_country || !form.destination_country || !form.responsible_employee_id) return;
    try {
      // nextDocNumber calls the Postgres generate_doc_number() function which uses
      // an advisory lock + persistent counter — safe under concurrent use and after deletions.
      const orderNo = await nextDocNumber('ORD');
      const result = await insertMut.mutateAsync({
        order_no: orderNo,
        ...form,
        status_step: 1,
      });
      setDialogOpen(false);
      if (result?.id) navigate(`/orders/${result.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const orderId = deleteTarget.id;
      const step = deleteTarget.status_step || 1;
      const isClosed = !!deleteTarget.closed_at;

      if (step >= 7 || isClosed) {
        // Orders that reached Step 7+ or were closed: NEVER delete the record.
        // Only clear financial/operational data (once). Keep the order row and its status.
        await (supabase.from('payments') as any).delete().eq('order_id', orderId);
        await (supabase.from('commissions') as any).delete().eq('order_id', orderId);
        await (supabase.from('invoices') as any).delete().eq('order_id', orderId);
        await (supabase.from('vendor_bills') as any).delete().eq('order_id', orderId);

        const { data: orderQuotations } = await (supabase.from('quotations') as any).select('id').eq('order_id', orderId);
        if (orderQuotations?.length) {
          for (const q of orderQuotations) {
            await (supabase.from('quotation_services') as any).delete().eq('quotation_id', q.id);
            await (supabase.from('quotation_payment_terms') as any).delete().eq('quotation_id', q.id);
          }
        }
        await (supabase.from('quotations') as any).delete().eq('order_id', orderId);
        await (supabase.from('order_costs') as any).delete().eq('order_id', orderId);

        // Keep the order record — do NOT reset status_step or clear closed_at
        toast.success(`Order ${deleteTarget.order_no}: financial data cleared. Order record kept.`);
      } else {
        // Orders before Step 7 that were never closed: delete everything including order record
        await (supabase.from('payments') as any).delete().eq('order_id', orderId);
        await (supabase.from('commissions') as any).delete().eq('order_id', orderId);
        await (supabase.from('invoices') as any).delete().eq('order_id', orderId);
        await (supabase.from('vendor_bills') as any).delete().eq('order_id', orderId);

        const { data: orderQuotations } = await (supabase.from('quotations') as any).select('id').eq('order_id', orderId);
        if (orderQuotations?.length) {
          for (const q of orderQuotations) {
            await (supabase.from('quotation_services') as any).delete().eq('quotation_id', q.id);
            await (supabase.from('quotation_payment_terms') as any).delete().eq('quotation_id', q.id);
          }
        }
        await (supabase.from('quotations') as any).delete().eq('order_id', orderId);
        await (supabase.from('order_costs') as any).delete().eq('order_id', orderId);
        await (supabase.from('orders') as any).delete().eq('id', orderId);

        toast.success('Order and all related data deleted.');
      }
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      window.location.reload();
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2"><Package className="w-6 h-6 text-primary" />Orders</h1>
          <p className="erp-page-subtitle">{orders.length} orders — 9-step workflow</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Order</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div> : (
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Order #</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Route</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Mode</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Direction</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Step</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">ETD / ETA</th>
                  <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No orders yet. Click "New Order" to create one.</td></tr>
                ) : filtered.map((o: any) => (
                  <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td className="px-5 py-3 font-mono font-medium text-primary">{o.order_no}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{o.origin_city || o.origin_country} → {o.destination_city || o.destination_country}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={o.mode} /></td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={o.direction} /></td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className={`step-indicator text-xs ${o.status_step === 9 ? 'step-complete' : 'step-current'}`}>{o.status_step}</div>
                        <span className="text-xs text-muted-foreground">{stepLabels[o.status_step]}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{o.etd || '—'} → {o.eta || '—'}</td>
                    <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(o)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order {deleteTarget?.order_no}?</AlertDialogTitle>
            <AlertDialogDescription>
              {(deleteTarget?.status_step >= 7 || deleteTarget?.closed_at)
                ? 'This order reached Step 7 or was closed. The order record will be permanently kept in the list, but all financial data (invoices, bills, costs, quotations, payments) will be cleared. This cannot be undone.'
                : 'This order has not reached Step 7. The order and ALL related data will be permanently deleted from the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Order — Step 1: Setup</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label className="text-xs">Customer *</Label>
              <Select value={form.customer_id} onValueChange={v => setField('customer_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Transport Mode *</Label>
                <Select value={form.mode} onValueChange={v => setField('mode', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sea">Sea</SelectItem><SelectItem value="air">Air</SelectItem>
                    <SelectItem value="road">Road</SelectItem><SelectItem value="rail">Rail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Direction *</Label>
                <Select value={form.direction} onValueChange={v => setField('direction', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="import">Import</SelectItem><SelectItem value="export">Export</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Responsible Employee *</Label>
              <Select value={form.responsible_employee_id} onValueChange={v => setField('responsible_employee_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Origin Country *</Label>
                <Select value={form.origin_country} onValueChange={v => { setField('origin_country', v); setField('origin_city', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(countryCityMap).sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Origin City</Label>
                <Select value={form.origin_city} onValueChange={v => setField('origin_city', v)} disabled={!form.origin_country}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {(countryCityMap[form.origin_country] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Destination Country *</Label>
                <Select value={form.destination_country} onValueChange={v => { setField('destination_country', v); setField('destination_city', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(countryCityMap).sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Destination City</Label>
                <Select value={form.destination_city} onValueChange={v => setField('destination_city', v)} disabled={!form.destination_country}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {(countryCityMap[form.destination_country] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={insertMut.isPending}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
