import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Lock, Plus, Trash2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { FxLockedBadge } from '@/components/FxLockedBadge';
import { cn } from '@/lib/utils';
import { useTableQuery, useUpdateMutation, useInsertMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_FX_RATE, calculateDualAmount, formatUSD, formatIQD } from '@/lib/currency';
import { toast } from 'sonner';
import { generateQuotationPDF, generateInvoicePDF, generateVendorBillPDF } from '@/lib/pdf-generator';

const steps = [
  { num: 1, title: 'Order Setup', desc: 'Customer & route' },
  { num: 2, title: 'Shipment Details', desc: 'Cargo info' },
  { num: 3, title: 'Cost Sheet', desc: 'Vendor costs' },
  { num: 4, title: 'Quotation', desc: 'Pricing' },
  { num: 5, title: 'Approval', desc: 'Customer sign-off' },
  { num: 6, title: 'Execution', desc: 'Carrier & tracking' },
  { num: 7, title: 'Invoice & Bills', desc: 'Documents' },
  { num: 8, title: 'Payments', desc: 'AR & AP' },
  { num: 9, title: 'Closure', desc: 'Final P&L' },
];

export default function OrderWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      if (isNew || !id) return null;
      const { data, error } = await (supabase.from('orders') as any).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!id,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const updateOrder = useUpdateMutation('orders');

  useEffect(() => {
    if (order?.status_step) setCurrentStep(order.status_step);
  }, [order]);

  const { data: customers = [] } = useTableQuery<any>('customers');
  const { data: employees = [] } = useTableQuery<any>('employees');
  const { data: vendors = [] } = useTableQuery<any>('vendors');
  const { data: costs = [] } = useTableQuery<any>('order_costs', { filter: order?.id ? { order_id: order.id } : undefined });
  const { data: quotations = [] } = useTableQuery<any>('quotations', { filter: order?.id ? { order_id: order.id } : undefined });
  const { data: invoices = [] } = useTableQuery<any>('invoices', { filter: order?.id ? { order_id: order.id } : undefined });
  const { data: vendorBills = [] } = useTableQuery<any>('vendor_bills', { filter: order?.id ? { order_id: order.id } : undefined });

  const insertCost = useInsertMutation('order_costs');
  const deleteCost = useDeleteMutation('order_costs');
  const insertQuotation = useInsertMutation('quotations');
  const insertInvoice = useInsertMutation('invoices');
  const insertBill = useInsertMutation('vendor_bills');

  if (isNew) {
    navigate('/orders');
    return null;
  }

  if (isLoading) return <div className="erp-page"><Skeleton className="h-96 w-full" /></div>;
  if (!order) return <div className="erp-page"><p className="text-muted-foreground">Order not found.</p></div>;

  const saveOrderField = async (updates: Record<string, any>) => {
    await updateOrder.mutateAsync({ id: order.id, ...updates });
    queryClient.invalidateQueries({ queryKey: ['order', id] });
  };

  const advanceStep = async () => {
    if (currentStep < 9) {
      await saveOrderField({ status_step: currentStep + 1 });
      setCurrentStep(s => s + 1);
    }
  };

  const customerName = customers.find((c: any) => c.id === order.customer_id)?.company || '—';

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <div>
            <h1 className="erp-page-title">{order.order_no} — {customerName}</h1>
            <p className="erp-page-subtitle">9-Step Workflow</p>
          </div>
        </div>
      </div>

      {/* Step Progress */}
      <div className="erp-metric-card">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button onClick={() => s.num <= order.status_step && setCurrentStep(s.num)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg transition-colors min-w-fit',
                  s.num === currentStep && 'bg-primary/10', s.num < currentStep && 'opacity-70',
                  s.num > order.status_step && 'opacity-40 cursor-not-allowed',
                )}>
                <div className={cn('step-indicator', s.num < order.status_step && 'step-complete', s.num === currentStep && 'step-current', s.num > order.status_step && 'step-pending')}>
                  {s.num < order.status_step ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-medium text-foreground">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="erp-metric-card min-h-[400px]">
        {currentStep === 1 && <Step1 order={order} customers={customers} employees={employees} onSave={saveOrderField} />}
        {currentStep === 2 && <Step2 order={order} onSave={saveOrderField} />}
        {currentStep === 3 && <Step3 orderId={order.id} costs={costs} vendors={vendors} insertCost={insertCost} deleteCost={deleteCost} />}
        {currentStep === 4 && <Step4 order={order} costs={costs} quotations={quotations} insertQuotation={insertQuotation} customerName={customerName} />}
        {currentStep === 5 && <Step5 quotations={quotations} />}
        {currentStep === 6 && <Step6 order={order} onSave={saveOrderField} />}
        {currentStep === 7 && <Step7 order={order} quotations={quotations} costs={costs} invoices={invoices} vendorBills={vendorBills} insertInvoice={insertInvoice} insertBill={insertBill} customerName={customerName} vendors={vendors} />}
        {currentStep === 8 && <Step8 invoices={invoices} vendorBills={vendorBills} orderId={order.id} />}
        {currentStep === 9 && <Step9 order={order} costs={costs} invoices={invoices} onSave={saveOrderField} />}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" disabled={currentStep === 1} onClick={() => setCurrentStep(s => s - 1)}>Previous</Button>
        {currentStep === order.status_step && currentStep < 9 && (
          <Button onClick={advanceStep}>Complete Step & Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
        )}
      </div>
    </div>
  );
}

function Step1({ order, customers, employees, onSave }: any) {
  const [form, setForm] = useState({
    customer_id: order.customer_id || '', mode: order.mode || 'sea', direction: order.direction || 'import',
    origin_country: order.origin_country || '', origin_city: order.origin_city || '',
    destination_country: order.destination_country || '', destination_city: order.destination_city || '',
    responsible_employee_id: order.responsible_employee_id || '',
  });
  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 1 — Order Setup</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Customer *</Label>
          <Select value={form.customer_id} onValueChange={v => setField('customer_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Mode *</Label>
          <Select value={form.mode} onValueChange={v => setField('mode', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="sea">Sea</SelectItem><SelectItem value="air">Air</SelectItem><SelectItem value="road">Road</SelectItem><SelectItem value="rail">Rail</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Direction *</Label>
          <Select value={form.direction} onValueChange={v => setField('direction', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="import">Import</SelectItem><SelectItem value="export">Export</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Employee *</Label>
          <Select value={form.responsible_employee_id} onValueChange={v => setField('responsible_employee_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Origin Country *</Label><Input value={form.origin_country} onChange={e => setField('origin_country', e.target.value)} /></div>
        <div><Label>Origin City</Label><Input value={form.origin_city} onChange={e => setField('origin_city', e.target.value)} /></div>
        <div><Label>Dest Country *</Label><Input value={form.destination_country} onChange={e => setField('destination_country', e.target.value)} /></div>
        <div><Label>Dest City</Label><Input value={form.destination_city} onChange={e => setField('destination_city', e.target.value)} /></div>
      </div>
      <Button onClick={() => onSave(form)}>Save Step 1</Button>
    </div>
  );
}

function Step2({ order, onSave }: any) {
  const [form, setForm] = useState({
    cargo_desc: order.cargo_desc || '', weight: order.weight || '', volume: order.volume || '',
    packages: order.packages || '', container_type: order.container_type || '',
    etd: order.etd || '', eta: order.eta || '', incoterm: order.incoterm || '',
  });
  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 2 — Shipment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><Label>Cargo Description *</Label><Input value={form.cargo_desc} onChange={e => setField('cargo_desc', e.target.value)} /></div>
        <div><Label>Weight (kg) *</Label><Input type="number" value={form.weight} onChange={e => setField('weight', e.target.value)} /></div>
        <div><Label>Volume (CBM)</Label><Input type="number" value={form.volume} onChange={e => setField('volume', e.target.value)} /></div>
        <div><Label>Packages</Label><Input type="number" value={form.packages} onChange={e => setField('packages', e.target.value)} /></div>
        <div><Label>Container Type</Label>
          <Select value={form.container_type} onValueChange={v => setField('container_type', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="20ft">20' Standard</SelectItem><SelectItem value="40ft">40' Standard</SelectItem><SelectItem value="40hc">40' High Cube</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>ETD *</Label><Input type="date" value={form.etd} onChange={e => setField('etd', e.target.value)} /></div>
        <div><Label>ETA *</Label><Input type="date" value={form.eta} onChange={e => setField('eta', e.target.value)} /></div>
        <div><Label>Incoterm</Label>
          <Select value={form.incoterm} onValueChange={v => setField('incoterm', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="FOB">FOB</SelectItem><SelectItem value="CIF">CIF</SelectItem><SelectItem value="EXW">EXW</SelectItem><SelectItem value="DDP">DDP</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={() => onSave(form)}>Save Step 2</Button>
    </div>
  );
}

function Step3({ orderId, costs, vendors, insertCost, deleteCost }: any) {
  const [form, setForm] = useState({ vendor_id: '', category: '', description: '', amount_usd: 0, due_date: '', currency_input: 'USD' });
  const fxRate = DEFAULT_FX_RATE;
  const dual = calculateDualAmount(form.amount_usd, form.currency_input as any, fxRate, new Date().toISOString().split('T')[0]);
  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!form.vendor_id || form.amount_usd <= 0) return;
    await insertCost.mutateAsync({
      order_id: orderId, vendor_id: form.vendor_id, category: form.category,
      description: form.description, due_date: form.due_date || null,
      amount_usd: dual.amount_usd, amount_iqd: dual.amount_iqd,
      fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0],
      currency_input: form.currency_input, is_fx_locked: true,
    });
    setForm({ vendor_id: '', category: '', description: '', amount_usd: 0, due_date: '', currency_input: 'USD' });
  };

  const totalUsd = costs.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const totalIqd = costs.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 3 — Cost Sheet</h3>
      <div className="erp-table-container">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Vendor</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Category</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
            <th className="text-center px-4 py-2 font-medium text-muted-foreground">FX</th>
            <th className="w-10"></th>
          </tr></thead>
          <tbody>
            {costs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No costs added yet.</td></tr>
            ) : costs.map((c: any) => (
              <tr key={c.id} className="border-b border-border">
                <td className="px-4 py-2">{vendors.find((v: any) => v.id === c.vendor_id)?.company || '—'}</td>
                <td className="px-4 py-2">{c.category}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.description}</td>
                <td className="px-4 py-2 text-right"><CurrencyDisplay usd={c.amount_usd} iqd={c.amount_iqd} size="sm" /></td>
                <td className="px-4 py-2 text-center">{c.is_fx_locked && <FxLockedBadge />}</td>
                <td className="px-4 py-2"><Button variant="ghost" size="sm" onClick={() => deleteCost.mutate(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
              </tr>
            ))}
            {costs.length > 0 && (
              <tr className="bg-muted/30 font-medium">
                <td colSpan={3} className="px-4 py-2 text-right">Total:</td>
                <td className="px-4 py-2 text-right"><CurrencyDisplay usd={totalUsd} iqd={totalIqd} size="sm" /></td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
        <Select value={form.vendor_id} onValueChange={v => setField('vendor_id', v)}>
          <SelectTrigger><SelectValue placeholder="Vendor" /></SelectTrigger>
          <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.company}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Category" value={form.category} onChange={e => setField('category', e.target.value)} />
        <Input placeholder="Description" value={form.description} onChange={e => setField('description', e.target.value)} />
        <Input type="number" placeholder="Amount USD" value={form.amount_usd || ''} onChange={e => setField('amount_usd', parseFloat(e.target.value) || 0)} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Preview: {formatUSD(dual.amount_usd)} | {formatIQD(dual.amount_iqd)}</span>
        <Button variant="outline" onClick={handleAdd} disabled={insertCost.isPending}><Plus className="w-4 h-4 mr-1" />Add Cost</Button>
      </div>
    </div>
  );
}

function Step4({ order, costs, quotations, insertQuotation, customerName }: any) {
  const [marginPct, setMarginPct] = useState(25);
  const [validity, setValidity] = useState(30);
  const totalCostUsd = costs.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const serviceFeeUsd = totalCostUsd * (marginPct / 100);
  const totalUsd = totalCostUsd + serviceFeeUsd;
  const fxRate = DEFAULT_FX_RATE;

  const handleGenerate = async () => {
    if (costs.length === 0) { toast.error('Add costs first'); return; }
    const year = new Date().getFullYear();
    const quoteNo = `QUO-${year}-${String(quotations.length + 1).padStart(4, '0')}`;
    await insertQuotation.mutateAsync({
      quote_no: quoteNo, order_id: order.id, status: 'draft',
      margin_pct: marginPct, service_fee_usd: serviceFeeUsd, service_fee_iqd: serviceFeeUsd * fxRate,
      total_usd: totalUsd, total_iqd: totalUsd * fxRate,
      fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0],
      is_fx_locked: true, validity_days: validity,
    });
    // Generate PDF
    generateQuotationPDF({
      quoteNo, customerName, order, costs, marginPct,
      serviceFeeUsd, totalUsd, fxRate,
      fxDate: new Date().toISOString().split('T')[0], validity,
    });
    toast.success('Quotation created & PDF generated');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 4 — Quotation Generation</h3>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Margin %</Label><Input type="number" value={marginPct} onChange={e => setMarginPct(parseFloat(e.target.value) || 0)} /></div>
        <div><Label>Validity (days)</Label><Input type="number" value={validity} onChange={e => setValidity(parseInt(e.target.value) || 30)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
        <div><p className="text-xs text-muted-foreground">Total Costs</p><CurrencyDisplay usd={totalCostUsd} iqd={totalCostUsd * fxRate} size="md" layout="stacked" /></div>
        <div><p className="text-xs text-muted-foreground">Service Fee</p><CurrencyDisplay usd={serviceFeeUsd} iqd={serviceFeeUsd * fxRate} size="md" layout="stacked" /></div>
        <div><p className="text-xs text-muted-foreground">Total Quote</p><CurrencyDisplay usd={totalUsd} iqd={totalUsd * fxRate} size="md" layout="stacked" /></div>
      </div>
      {quotations.length > 0 && (
        <div className="p-3 rounded-lg bg-accent text-sm">
          ✅ Quotation {quotations[0].quote_no} generated ({quotations[0].status})
        </div>
      )}
      <Button onClick={handleGenerate} disabled={insertQuotation.isPending}>
        <FileDown className="w-4 h-4 mr-2" />{quotations.length > 0 ? 'Regenerate' : 'Generate'} Quotation PDF
      </Button>
    </div>
  );
}

function Step5({ quotations }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 5 — Quotation Approval</h3>
      {quotations.length === 0 ? (
        <p className="text-muted-foreground">Generate a quotation in Step 4 first.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Upload signed quotation from customer to proceed.</p>
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">Drag & drop signed PDF here</p>
            <Button variant="outline" className="mt-4">Upload Signed PDF</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Step6({ order, onSave }: any) {
  const [form, setForm] = useState({
    carrier_type: order.carrier_type || '', carrier_name: order.carrier_name || '',
    container_number: order.container_number || '', seal_number: order.seal_number || '',
    equipment_size: order.equipment_size || '',
  });
  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 6 — Shipment Execution</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Carrier Type</Label>
          <Select value={form.carrier_type} onValueChange={v => setField('carrier_type', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="sea">Sea Carrier</SelectItem><SelectItem value="air">Air Carrier</SelectItem><SelectItem value="road">Road Carrier</SelectItem><SelectItem value="rail">Rail Carrier</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Carrier Name</Label><Input value={form.carrier_name} onChange={e => setField('carrier_name', e.target.value)} /></div>
        <div><Label>Container Number</Label><Input value={form.container_number} onChange={e => setField('container_number', e.target.value)} /></div>
        <div><Label>Seal Number</Label><Input value={form.seal_number} onChange={e => setField('seal_number', e.target.value)} /></div>
      </div>
      <Button onClick={() => onSave(form)}>Save Execution Details</Button>
    </div>
  );
}

function Step7({ order, quotations, costs, invoices, vendorBills, insertInvoice, insertBill, customerName, vendors }: any) {
  const quotation = quotations[0];
  const fxRate = quotation?.fx_rate || DEFAULT_FX_RATE;

  const handleGenerateInvoice = async () => {
    if (!quotation) { toast.error('Generate quotation first'); return; }
    const year = new Date().getFullYear();
    const invNo = `INV-${year}-${String(invoices.length + 1).padStart(4, '0')}`;
    await insertInvoice.mutateAsync({
      invoice_no: invNo, order_id: order.id, customer_id: order.customer_id,
      status: 'issued', amount_usd: quotation.total_usd, amount_iqd: quotation.total_iqd,
      fx_rate: fxRate, fx_date: quotation.fx_date, is_fx_locked: true,
      issued_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    });
    generateInvoicePDF({ invoiceNo: invNo, customerName, order, totalUsd: quotation.total_usd, totalIqd: quotation.total_iqd, fxRate, fxDate: quotation.fx_date });
    toast.success('Invoice generated');
  };

  const handleGenerateBills = async () => {
    const vendorGroups: Record<string, any[]> = {};
    costs.forEach((c: any) => { if (c.vendor_id) { if (!vendorGroups[c.vendor_id]) vendorGroups[c.vendor_id] = []; vendorGroups[c.vendor_id].push(c); } });
    const year = new Date().getFullYear();
    let idx = vendorBills.length;
    for (const [vendorId, vendorCosts] of Object.entries(vendorGroups)) {
      idx++;
      const totalUsd = vendorCosts.reduce((s: number, c: any) => s + c.amount_usd, 0);
      const totalIqd = vendorCosts.reduce((s: number, c: any) => s + c.amount_iqd, 0);
      const billNo = `BILL-${year}-${String(idx).padStart(4, '0')}`;
      await insertBill.mutateAsync({
        bill_no: billNo, order_id: order.id, vendor_id: vendorId,
        status: 'issued', amount_usd: totalUsd, amount_iqd: totalIqd,
        fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0], is_fx_locked: true,
        issued_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
      const vendorName = vendors.find((v: any) => v.id === vendorId)?.company || '';
      generateVendorBillPDF({ billNo, vendorName, order, totalUsd, totalIqd, fxRate, fxDate: new Date().toISOString().split('T')[0], costs: vendorCosts });
    }
    toast.success('Vendor bills generated');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 7 — Invoice & Vendor Bills</h3>
      {invoices.length > 0 && <p className="text-sm text-accent-foreground bg-accent p-3 rounded-lg">✅ Invoice: {invoices[0].invoice_no}</p>}
      {vendorBills.length > 0 && <p className="text-sm text-accent-foreground bg-accent p-3 rounded-lg">✅ {vendorBills.length} vendor bill(s) generated</p>}
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={handleGenerateInvoice} disabled={insertInvoice.isPending || !quotation}><FileDown className="w-4 h-4 mr-2" />Generate Invoice</Button>
        <Button variant="outline" onClick={handleGenerateBills} disabled={insertBill.isPending || costs.length === 0}><FileDown className="w-4 h-4 mr-2" />Generate Vendor Bills</Button>
      </div>
    </div>
  );
}

function Step8({ invoices, vendorBills, orderId }: any) {
  const insertPayment = useInsertMutation('payments');
  const updateInvoice = useUpdateMutation('invoices');
  const updateBill = useUpdateMutation('vendor_bills');
  const { data: payments = [] } = useTableQuery<any>('payments', { filter: { order_id: orderId } });

  const [payForm, setPayForm] = useState({
    direction: 'AR' as 'AR' | 'AP',
    ref_id: '',
    amount_usd: 0,
    currency_input: 'USD',
    method: 'bank_transfer',
    reference: '',
    pay_fx_rate: DEFAULT_FX_RATE,
  });
  const setPay = (k: string, v: any) => setPayForm(p => ({ ...p, [k]: v }));

  const selectedDoc = payForm.direction === 'AR'
    ? invoices.find((i: any) => i.id === payForm.ref_id)
    : vendorBills.find((b: any) => b.id === payForm.ref_id);

  const docFxRate = selectedDoc?.fx_rate || DEFAULT_FX_RATE;
  const payFxRate = payForm.pay_fx_rate;
  const dual = calculateDualAmount(payForm.amount_usd, payForm.currency_input as any, payFxRate, new Date().toISOString().split('T')[0]);

  // FX gain/loss calc
  const fxDiffIqd = payForm.amount_usd * payFxRate - payForm.amount_usd * docFxRate;
  const fxGainLossUsd = payFxRate > 0 ? Math.round((fxDiffIqd / payFxRate) * 100) / 100 : 0;
  const fxGainLossIqd = Math.round(fxDiffIqd);

  const handleRecordPayment = async () => {
    if (!payForm.ref_id || payForm.amount_usd <= 0) { toast.error('Select document and enter amount'); return; }
    const year = new Date().getFullYear();
    const payNo = `PAY-${year}-${String(payments.length + 1).padStart(4, '0')}`;
    await insertPayment.mutateAsync({
      pay_no: payNo,
      order_id: orderId,
      direction: payForm.direction,
      ref_type: payForm.direction === 'AR' ? 'invoice' : 'bill',
      ref_id: payForm.ref_id,
      counterparty_id: selectedDoc?.customer_id || selectedDoc?.vendor_id || null,
      amount_usd: dual.amount_usd,
      amount_iqd: dual.amount_iqd,
      fx_rate: payFxRate,
      fx_date: new Date().toISOString().split('T')[0],
      currency_input: payForm.currency_input,
      pay_currency: payForm.currency_input,
      is_fx_locked: true,
      date: new Date().toISOString().split('T')[0],
      method: payForm.method,
      reference: payForm.reference,
      fx_gain_loss_usd: fxGainLossUsd,
      fx_gain_loss_iqd: fxGainLossIqd,
    });

    // Update paid amounts on the document
    if (payForm.direction === 'AR' && selectedDoc) {
      await updateInvoice.mutateAsync({
        id: selectedDoc.id,
        paid_usd: (selectedDoc.paid_usd || 0) + dual.amount_usd,
        paid_iqd: (selectedDoc.paid_iqd || 0) + dual.amount_iqd,
        status: (selectedDoc.paid_usd || 0) + dual.amount_usd >= selectedDoc.amount_usd ? 'paid' : 'partial',
      });
    } else if (selectedDoc) {
      await updateBill.mutateAsync({
        id: selectedDoc.id,
        paid_usd: (selectedDoc.paid_usd || 0) + dual.amount_usd,
        paid_iqd: (selectedDoc.paid_iqd || 0) + dual.amount_iqd,
        status: (selectedDoc.paid_usd || 0) + dual.amount_usd >= selectedDoc.amount_usd ? 'paid' : 'partial',
      });
    }

    setPayForm(p => ({ ...p, ref_id: '', amount_usd: 0, reference: '' }));
    toast.success('Payment recorded');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 8 — Payment Processing</h3>

      {/* Outstanding summary */}
      <div className="grid grid-cols-2 gap-4">
        {invoices.map((inv: any) => (
          <div key={inv.id} className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">AR: {inv.invoice_no}</p>
            <CurrencyDisplay usd={(inv.amount_usd || 0) - (inv.paid_usd || 0)} iqd={(inv.amount_iqd || 0) - (inv.paid_iqd || 0)} size="md" layout="stacked" />
            <p className="text-xs mt-1 text-muted-foreground">Doc FX: {inv.fx_rate}</p>
          </div>
        ))}
        {vendorBills.map((bill: any) => (
          <div key={bill.id} className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">AP: {bill.bill_no}</p>
            <CurrencyDisplay usd={(bill.amount_usd || 0) - (bill.paid_usd || 0)} iqd={(bill.amount_iqd || 0) - (bill.paid_iqd || 0)} size="md" layout="stacked" />
            <p className="text-xs mt-1 text-muted-foreground">Doc FX: {bill.fx_rate}</p>
          </div>
        ))}
      </div>

      {/* Record payment form */}
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <p className="text-sm font-medium">Record Payment</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={payForm.direction} onValueChange={v => { setPay('direction', v); setPay('ref_id', ''); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="AR">AR (Customer)</SelectItem><SelectItem value="AP">AP (Vendor)</SelectItem></SelectContent>
          </Select>
          <Select value={payForm.ref_id} onValueChange={v => setPay('ref_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select document" /></SelectTrigger>
            <SelectContent>
              {payForm.direction === 'AR'
                ? invoices.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.invoice_no} ({formatUSD(i.amount_usd - (i.paid_usd || 0))} remaining)</SelectItem>)
                : vendorBills.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.bill_no} ({formatUSD(b.amount_usd - (b.paid_usd || 0))} remaining)</SelectItem>)
              }
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Amount USD" value={payForm.amount_usd || ''} onChange={e => setPay('amount_usd', parseFloat(e.target.value) || 0)} />
          <Input type="number" placeholder="Payment FX Rate" value={payForm.pay_fx_rate} onChange={e => setPay('pay_fx_rate', parseFloat(e.target.value) || DEFAULT_FX_RATE)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={payForm.method} onValueChange={v => setPay('method', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="check">Check</SelectItem></SelectContent>
          </Select>
          <Input placeholder="Reference #" value={payForm.reference} onChange={e => setPay('reference', e.target.value)} />
          <div className="col-span-2 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              IQD: {formatIQD(dual.amount_iqd)}
            </span>
            {selectedDoc && (
              <span className={`text-sm font-medium ${fxGainLossUsd >= 0 ? 'fx-gain' : 'fx-loss'}`}>
                FX {fxGainLossUsd >= 0 ? 'Gain' : 'Loss'}: {formatUSD(Math.abs(fxGainLossUsd))}
              </span>
            )}
          </div>
        </div>
        <Button onClick={handleRecordPayment} disabled={insertPayment.isPending}>
          <Plus className="w-4 h-4 mr-2" />Record Payment
        </Button>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="erp-table-container">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Pay #</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Dir</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">FX G/L</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Method</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
            </tr></thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="px-4 py-2 font-mono text-xs">{p.pay_no}</td>
                  <td className="px-4 py-2"><span className={`text-xs font-medium ${p.direction === 'AR' ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--warning))]'}`}>{p.direction}</span></td>
                  <td className="px-4 py-2 text-right"><CurrencyDisplay usd={p.amount_usd} iqd={p.amount_iqd} size="sm" /></td>
                  <td className="px-4 py-2 text-right"><span className={(p.fx_gain_loss_usd || 0) >= 0 ? 'fx-gain' : 'fx-loss'}>{formatUSD(Math.abs(p.fx_gain_loss_usd || 0))}</span></td>
                  <td className="px-4 py-2 capitalize">{p.method?.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Step9({ order, costs, invoices, onSave }: any) {
  const revenueUsd = invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
  const costsUsd = costs.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const profitUsd = revenueUsd - costsUsd;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 9 — Order Closure</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground">Revenue</p><CurrencyDisplay usd={revenueUsd} iqd={revenueUsd * DEFAULT_FX_RATE} size="md" layout="stacked" /></div>
        <div className="p-4 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground">Costs</p><CurrencyDisplay usd={costsUsd} iqd={costsUsd * DEFAULT_FX_RATE} size="md" layout="stacked" /></div>
        <div className="p-4 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground">Net Profit</p><CurrencyDisplay usd={profitUsd} iqd={profitUsd * DEFAULT_FX_RATE} size="md" layout="stacked" /></div>
      </div>
      {order.status_step < 9 && <Button variant="destructive" onClick={() => onSave({ status_step: 9, closed_at: new Date().toISOString() })}>Close Order & Lock</Button>}
      {order.status_step === 9 && <p className="text-sm text-accent-foreground bg-accent p-3 rounded-lg">✅ Order closed on {order.closed_at?.split('T')[0]}</p>}
    </div>
  );
}
