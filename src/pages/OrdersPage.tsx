import { Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useTableQuery, useInsertMutation } from '@/hooks/use-supabase-query';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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

  const generateOrderNo = () => {
    const year = new Date().getFullYear();
    const nextNum = orders.length + 1;
    return `ORD-${year}-${String(nextNum).padStart(4, '0')}`;
  };

  const handleCreate = async () => {
    if (!form.customer_id || !form.origin_country || !form.destination_country || !form.responsible_employee_id) return;
    const orderNo = generateOrderNo();
    const result = await insertMut.mutateAsync({
      order_no: orderNo,
      ...form,
      status_step: 1,
    });
    setDialogOpen(false);
    if (result?.id) navigate(`/orders/${result.id}`);
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
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No orders yet. Click "New Order" to create one.</td></tr>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <div><Label className="text-xs">Origin Country *</Label><Input value={form.origin_country} onChange={e => setField('origin_country', e.target.value)} placeholder="e.g. China" /></div>
              <div><Label className="text-xs">Origin City</Label><Input value={form.origin_city} onChange={e => setField('origin_city', e.target.value)} placeholder="e.g. Shanghai" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Destination Country *</Label><Input value={form.destination_country} onChange={e => setField('destination_country', e.target.value)} placeholder="e.g. Iraq" /></div>
              <div><Label className="text-xs">Destination City</Label><Input value={form.destination_city} onChange={e => setField('destination_city', e.target.value)} placeholder="e.g. Basra" /></div>
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
