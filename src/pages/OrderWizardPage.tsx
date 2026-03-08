import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Lock, Plus, Trash2, FileDown, Eye, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
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
  const { data: partners = [] } = useTableQuery<any>('partners');
  const { data: costs = [] } = useTableQuery<any>('order_costs', { filter: order?.id ? { order_id: order.id } : undefined });
  const { data: quotations = [] } = useTableQuery<any>('quotations', { filter: order?.id ? { order_id: order.id } : undefined });
  const { data: invoices = [] } = useTableQuery<any>('invoices', { filter: order?.id ? { order_id: order.id } : undefined });
  const { data: vendorBills = [] } = useTableQuery<any>('vendor_bills', { filter: order?.id ? { order_id: order.id } : undefined });
  const { data: quotationTemplates = [] } = useTableQuery<any>('quotation_templates');
  const { data: companySettings = [] } = useTableQuery<any>('company_settings');
  const { data: payments = [] } = useTableQuery<any>('payments', { filter: order?.id ? { order_id: order.id } : undefined });

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
        {currentStep === 3 && <Step3 orderId={order.id} costs={costs} vendors={vendors} partners={partners} employees={employees} order={order} insertCost={insertCost} deleteCost={deleteCost} />}
        {currentStep === 4 && <Step4 order={order} costs={costs} quotations={quotations} insertQuotation={insertQuotation} customerName={customerName} customers={customers} partners={partners} employees={employees} quotationTemplates={quotationTemplates} companySettings={companySettings} />}
        {currentStep === 5 && <Step5 quotations={quotations} />}
        {currentStep === 6 && <Step6 order={order} onSave={saveOrderField} />}
        {currentStep === 7 && <Step7 order={order} quotations={quotations} costs={costs} invoices={invoices} vendorBills={vendorBills} insertInvoice={insertInvoice} insertBill={insertBill} customerName={customerName} vendors={vendors} payments={payments} customers={customers} />}
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

function Step3({ orderId, costs, vendors, partners, employees, order, insertCost, deleteCost }: any) {
  const [form, setForm] = useState({ vendor_id: '', category: '', description: '', amount_usd: 0, due_date: '', currency_input: 'USD' });
  const [commissionForm, setCommissionForm] = useState({
    partner_id: '', partner_rate: 0, partner_amount_usd: 0,
    employee_id: order?.responsible_employee_id || '', employee_rate: 0, employee_amount_usd: 0,
  });
  const fxRate = DEFAULT_FX_RATE;
  const dual = calculateDualAmount(form.amount_usd, form.currency_input as any, fxRate, new Date().toISOString().split('T')[0]);
  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const setCommField = (k: string, v: any) => setCommissionForm(p => ({ ...p, [k]: v }));

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

  const handleAddCommission = async () => {
    if (commissionForm.partner_id && commissionForm.partner_amount_usd > 0) {
      const pDual = calculateDualAmount(commissionForm.partner_amount_usd, 'USD', fxRate, new Date().toISOString().split('T')[0]);
      await insertCost.mutateAsync({
        order_id: orderId, vendor_id: null, category: 'partner_commission',
        description: `Partner/Broker Commission (${commissionForm.partner_rate}%)`,
        amount_usd: pDual.amount_usd, amount_iqd: pDual.amount_iqd,
        fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0],
        currency_input: 'USD', is_fx_locked: true,
      });
    }
    if (commissionForm.employee_id && commissionForm.employee_amount_usd > 0) {
      const eDual = calculateDualAmount(commissionForm.employee_amount_usd, 'USD', fxRate, new Date().toISOString().split('T')[0]);
      await insertCost.mutateAsync({
        order_id: orderId, vendor_id: null, category: 'employee_incentive',
        description: `Employee Incentive (${commissionForm.employee_rate}%)`,
        amount_usd: eDual.amount_usd, amount_iqd: eDual.amount_iqd,
        fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0],
        currency_input: 'USD', is_fx_locked: true,
      });
    }
    toast.success('Commission/Incentive added');
  };

  // Separate vendor costs from commission/incentive costs
  const vendorCosts = costs.filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive');
  const commCosts = costs.filter((c: any) => c.category === 'partner_commission' || c.category === 'employee_incentive');

  const totalVendorUsd = vendorCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const totalVendorIqd = vendorCosts.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);
  const totalCommUsd = commCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const totalCommIqd = commCosts.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);
  const totalUsd = totalVendorUsd + totalCommUsd;
  const totalIqd = totalVendorIqd + totalCommIqd;

  // Auto-calc partner amount when rate changes
  const handlePartnerRateChange = (rate: number) => {
    setCommField('partner_rate', rate);
    setCommField('partner_amount_usd', Math.round(totalVendorUsd * (rate / 100) * 100) / 100);
  };
  const handleEmployeeRateChange = (rate: number) => {
    setCommField('employee_rate', rate);
    setCommField('employee_amount_usd', Math.round(totalVendorUsd * (rate / 100) * 100) / 100);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 3 — Cost Sheet</h3>

      {/* Vendor Costs Table */}
      <p className="text-sm font-medium text-muted-foreground">Vendor Costs</p>
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
            {vendorCosts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No vendor costs added yet.</td></tr>
            ) : vendorCosts.map((c: any) => (
              <tr key={c.id} className="border-b border-border">
                <td className="px-4 py-2">{vendors.find((v: any) => v.id === c.vendor_id)?.company || '—'}</td>
                <td className="px-4 py-2">{c.category}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.description}</td>
                <td className="px-4 py-2 text-right"><CurrencyDisplay usd={c.amount_usd} iqd={c.amount_iqd} size="sm" /></td>
                <td className="px-4 py-2 text-center">{c.is_fx_locked && <FxLockedBadge />}</td>
                <td className="px-4 py-2"><Button variant="ghost" size="sm" onClick={() => deleteCost.mutate(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
              </tr>
            ))}
            {vendorCosts.length > 0 && (
              <tr className="bg-muted/30 font-medium">
                <td colSpan={3} className="px-4 py-2 text-right">Vendor Total:</td>
                <td className="px-4 py-2 text-right"><CurrencyDisplay usd={totalVendorUsd} iqd={totalVendorIqd} size="sm" /></td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add vendor cost form */}
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

      {/* Commission & Incentive Section */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Partner/Broker Commission & Employee Incentive</p>

        {/* Existing commission/incentive entries */}
        {commCosts.length > 0 && (
          <div className="erp-table-container mb-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                <th className="w-10"></th>
              </tr></thead>
              <tbody>
                {commCosts.map((c: any) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-4 py-2 capitalize">{c.category === 'partner_commission' ? '🤝 Partner Commission' : '💰 Employee Incentive'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.description}</td>
                    <td className="px-4 py-2 text-right"><CurrencyDisplay usd={c.amount_usd} iqd={c.amount_iqd} size="sm" /></td>
                    <td className="px-4 py-2"><Button variant="ghost" size="sm" onClick={() => deleteCost.mutate(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-medium">
                  <td colSpan={2} className="px-4 py-2 text-right">Commission/Incentive Total:</td>
                  <td className="px-4 py-2 text-right"><CurrencyDisplay usd={totalCommUsd} iqd={totalCommIqd} size="sm" /></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          {/* Partner Commission */}
          <div className="space-y-2 p-3 border border-border rounded-lg">
            <p className="text-xs font-semibold text-muted-foreground uppercase">🤝 Partner/Broker Commission</p>
            <Select value={commissionForm.partner_id} onValueChange={v => setCommField('partner_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select Partner" /></SelectTrigger>
              <SelectContent>{partners.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.company}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Rate %</Label>
                <Input type="number" value={commissionForm.partner_rate || ''} onChange={e => handlePartnerRateChange(parseFloat(e.target.value) || 0)} />
              </div>
              <div><Label className="text-xs">Amount USD</Label>
                <Input type="number" value={commissionForm.partner_amount_usd || ''} onChange={e => setCommField('partner_amount_usd', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Employee Incentive */}
          <div className="space-y-2 p-3 border border-border rounded-lg">
            <p className="text-xs font-semibold text-muted-foreground uppercase">💰 Employee Incentive</p>
            <Select value={commissionForm.employee_id} onValueChange={v => setCommField('employee_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Rate %</Label>
                <Input type="number" value={commissionForm.employee_rate || ''} onChange={e => handleEmployeeRateChange(parseFloat(e.target.value) || 0)} />
              </div>
              <div><Label className="text-xs">Amount USD</Label>
                <Input type="number" value={commissionForm.employee_amount_usd || ''} onChange={e => setCommField('employee_amount_usd', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Button variant="outline" onClick={handleAddCommission} disabled={insertCost.isPending}>
            <Plus className="w-4 h-4 mr-1" />Add Commission / Incentive
          </Button>
        </div>
      </div>

      {/* Grand Total */}
      {costs.length > 0 && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-muted-foreground">Vendor Costs</p><CurrencyDisplay usd={totalVendorUsd} iqd={totalVendorIqd} size="md" layout="stacked" /></div>
            <div><p className="text-xs text-muted-foreground">Commission + Incentive</p><CurrencyDisplay usd={totalCommUsd} iqd={totalCommIqd} size="md" layout="stacked" /></div>
            <div><p className="text-xs font-semibold">Grand Total</p><CurrencyDisplay usd={totalUsd} iqd={totalIqd} size="md" layout="stacked" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step4({ order, costs, quotations, insertQuotation, customerName, customers, partners, employees, quotationTemplates, companySettings }: any) {
  const queryClient = useQueryClient();
  const [quotationPriceUsd, setQuotationPriceUsd] = useState(0);
  const [validity, setValidity] = useState(30);
  const [quotationDescription, setQuotationDescription] = useState('');
  const [fxDate, setFxDate] = useState(new Date().toISOString().split('T')[0]);
  const [fxRateOverride, setFxRateOverride] = useState<number>(DEFAULT_FX_RATE);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState([
    { description: '50% upon booking', percentage: 50 },
    { description: '50% upon delivery', percentage: 50 },
  ]);
  const [newTerm, setNewTerm] = useState({ description: '', percentage: 0 });

  const fxRate = fxRateOverride;
  const company = companySettings?.[0] || {};
  const customer = customers?.find((c: any) => c.id === order.customer_id) || {};

  // Set default template
  useEffect(() => {
    if (!selectedTemplateId && quotationTemplates.length > 0) {
      const def = quotationTemplates.find((t: any) => t.is_default) || quotationTemplates[0];
      setSelectedTemplateId(def.id);
    }
  }, [quotationTemplates]);

  // Separate cost categories
  const vendorCosts = costs.filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive');
  const partnerCommCosts = costs.filter((c: any) => c.category === 'partner_commission');
  const employeeIncentiveCosts = costs.filter((c: any) => c.category === 'employee_incentive');

  const totalVendorCostUsd = vendorCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const totalVendorCostIqd = vendorCosts.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);
  const totalPartnerCommUsd = partnerCommCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const totalPartnerCommIqd = partnerCommCosts.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);
  const totalEmployeeIncentiveUsd = employeeIncentiveCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const totalEmployeeIncentiveIqd = employeeIncentiveCosts.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);
  const totalCommUsd = totalPartnerCommUsd + totalEmployeeIncentiveUsd;
  const totalCommIqd = totalPartnerCommIqd + totalEmployeeIncentiveIqd;
  const totalCostWithCommUsd = totalVendorCostUsd + totalCommUsd;
  const totalCostWithCommIqd = totalVendorCostIqd + totalCommIqd;

  // === PRICING FORMULA ===
  const totalProfit = quotationPriceUsd - totalVendorCostUsd;
  const serviceFeeUsd = totalProfit * 0.25;
  const netProfitUsd = totalProfit - serviceFeeUsd;
  const marginPct = totalVendorCostUsd > 0 ? (serviceFeeUsd / totalVendorCostUsd) * 100 : 0;

  // Margin with commissions
  const profitAfterComm = quotationPriceUsd - totalCostWithCommUsd;
  const marginWithCommPct = totalCostWithCommUsd > 0 ? ((quotationPriceUsd - totalCostWithCommUsd) / totalCostWithCommUsd) * 100 : 0;

  // Service breakdown
  const serviceBreakdown = vendorCosts.map((c: any) => {
    const costUsd = c.amount_usd || 0;
    const costIqd = c.amount_iqd || 0;
    const feeUsd = costUsd * (marginPct / 100);
    const feeIqd = feeUsd * fxRate;
    const quotedUsd = costUsd + feeUsd;
    const quotedIqd = quotedUsd * fxRate;
    return {
      ...c,
      vendor_cost_usd: costUsd, vendor_cost_iqd: costIqd,
      service_fee_usd: feeUsd, service_fee_iqd: feeIqd,
      quoted_price_usd: quotedUsd, quoted_price_iqd: quotedIqd,
    };
  });

  const finalProfitUsd = netProfitUsd - totalCommUsd;

  // Auto-set price on first render
  useEffect(() => {
    if (quotationPriceUsd === 0 && totalVendorCostUsd > 0) {
      setQuotationPriceUsd(Math.round(totalVendorCostUsd * 1.25 * 100) / 100);
    }
  }, [totalVendorCostUsd]);

  // Payment terms logic
  const addPaymentTerm = () => {
    if (!newTerm.description || newTerm.percentage <= 0) return;
    setPaymentTerms(prev => [...prev, { ...newTerm }]);
    setNewTerm({ description: '', percentage: 0 });
  };
  const removePaymentTerm = (idx: number) => setPaymentTerms(prev => prev.filter((_, i) => i !== idx));
  const totalTermsPct = paymentTerms.reduce((s, t) => s + t.percentage, 0);

  const selectedTemplate = quotationTemplates.find((t: any) => t.id === selectedTemplateId);

  const handleGenerate = async () => {
    if (costs.length === 0) { toast.error('Add costs first'); return; }
    if (quotationPriceUsd <= 0) { toast.error('Enter quotation price'); return; }
    if (totalTermsPct !== 100) { toast.error('Payment terms must total 100%'); return; }

    const year = new Date().getFullYear();
    const quoteNo = `Q-${year}-${String(quotations.length + 1).padStart(4, '0')}`;

    await insertQuotation.mutateAsync({
      quote_no: quoteNo, order_id: order.id, status: 'draft',
      margin_pct: Math.round(marginPct * 100) / 100,
      service_fee_usd: Math.round(serviceFeeUsd * 100) / 100,
      service_fee_iqd: Math.round(serviceFeeUsd * fxRate),
      total_usd: quotationPriceUsd, total_iqd: Math.round(quotationPriceUsd * fxRate),
      fx_rate: fxRate, fx_date: fxDate,
      is_fx_locked: true, validity_days: validity,
      template_id: selectedTemplateId || null,
      quotation_description: quotationDescription || null,
      currency_input: 'USD',
    });

    // Save quotation services
    for (const svc of serviceBreakdown) {
      await (supabase.from('quotation_services') as any).insert({
        quotation_id: (await (supabase.from('quotations') as any).select('id').eq('quote_no', quoteNo).single()).data?.id,
        service_name: svc.description || svc.category || 'Service',
        vendor_cost_usd: svc.vendor_cost_usd, vendor_cost_iqd: svc.vendor_cost_iqd,
        service_fee_usd: svc.service_fee_usd, service_fee_iqd: svc.service_fee_iqd,
        quoted_price_usd: svc.quoted_price_usd, quoted_price_iqd: svc.quoted_price_iqd,
        margin_pct: Math.round(marginPct * 100) / 100,
        fx_rate: fxRate, fx_date: fxDate,
      });
    }

    // Save payment terms
    const quotationId = (await (supabase.from('quotations') as any).select('id').eq('quote_no', quoteNo).single()).data?.id;
    if (quotationId) {
      for (const term of paymentTerms) {
        await (supabase.from('quotation_payment_terms') as any).insert({
          quotation_id: quotationId,
          description: term.description, percentage: term.percentage,
          amount_usd: Math.round(quotationPriceUsd * (term.percentage / 100) * 100) / 100,
          amount_iqd: Math.round(quotationPriceUsd * (term.percentage / 100) * fxRate),
          currency: 'USD',
        });
      }
    }

    // Generate PDF
    generateQuotationPDF({
      quoteNo, customerName, order, costs: vendorCosts, marginPct: Math.round(marginPct * 100) / 100,
      serviceFeeUsd: Math.round(serviceFeeUsd * 100) / 100,
      totalUsd: quotationPriceUsd, fxRate, fxDate, validity,
      serviceBreakdown, paymentTerms, quotationDescription,
      companyName: company.company_name || 'FreightFlow Logistics',
      companySlogan: company.company_slogan || 'Your Trusted Freight Forwarding Partner',
      companyLogoUrl: selectedTemplate?.company_logo_url || company.company_logo_url || null,
      customer,
    });

    queryClient.invalidateQueries({ queryKey: ['quotations'] });
    toast.success('Quotation created & PDF downloaded');
  };

  const handlePreviewDownload = () => {
    if (quotations.length === 0) { toast.error('Generate quotation first'); return; }
    const q = quotations[0];
    generateQuotationPDF({
      quoteNo: q.quote_no, customerName, order, costs: vendorCosts,
      marginPct: q.margin_pct || Math.round(marginPct * 100) / 100,
      serviceFeeUsd: q.service_fee_usd || Math.round(serviceFeeUsd * 100) / 100,
      totalUsd: q.total_usd || quotationPriceUsd, fxRate: q.fx_rate || fxRate,
      fxDate: q.fx_date || fxDate, validity: q.validity_days || validity,
      serviceBreakdown, paymentTerms, quotationDescription: q.quotation_description || quotationDescription,
      companyName: company.company_name || 'FreightFlow Logistics',
      companySlogan: company.company_slogan || 'Your Trusted Freight Forwarding Partner',
      companyLogoUrl: selectedTemplate?.company_logo_url || company.company_logo_url || null,
      customer,
    });
  };

  const handleSendToCustomer = async () => {
    if (quotations.length === 0) { toast.error('Generate quotation first'); return; }
    await (supabase.from('quotations') as any).update({ status: 'sent' }).eq('id', quotations[0].id);
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
    toast.success('Quotation marked as sent to customer');
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Step 4 — Quotation Generation</h3>

      {/* 1. Total Vendor Cost Summary */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-sm font-semibold mb-3">📊 Total Vendor Cost</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Vendor Costs (excl. comm.)</p>
            <p className="text-base font-semibold">{formatUSD(totalVendorCostUsd)}</p>
            <p className="text-xs text-muted-foreground">{formatIQD(totalVendorCostIqd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Partner Commission</p>
            <p className="text-base font-semibold">{formatUSD(totalPartnerCommUsd)}</p>
            <p className="text-xs text-muted-foreground">{formatIQD(totalPartnerCommIqd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Employee Incentive</p>
            <p className="text-base font-semibold">{formatUSD(totalEmployeeIncentiveUsd)}</p>
            <p className="text-xs text-muted-foreground">{formatIQD(totalEmployeeIncentiveIqd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Total (incl. comm.)</p>
            <p className="text-base font-bold">{formatUSD(totalCostWithCommUsd)}</p>
            <p className="text-xs text-muted-foreground">{formatIQD(totalCostWithCommIqd)}</p>
          </div>
        </div>
      </div>

      {/* 2. Selling Price, Margin, FX, Validity */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-sm font-semibold mb-3">💰 Selling Price & Margin</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Selling Price (USD) *</Label>
            <Input type="number" value={quotationPriceUsd || ''} onChange={e => setQuotationPriceUsd(parseFloat(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground mt-1">{formatIQD(quotationPriceUsd * fxRate)}</p>
          </div>
          <div>
            <Label>FX Date</Label>
            <Input type="date" value={fxDate} onChange={e => setFxDate(e.target.value)} />
          </div>
          <div>
            <Label>FX Rate (USD/IQD)</Label>
            <Input type="number" value={fxRateOverride} onChange={e => setFxRateOverride(parseFloat(e.target.value) || DEFAULT_FX_RATE)} />
            <p className="text-xs text-muted-foreground mt-1">Override allowed</p>
          </div>
          <div>
            <Label>Validity (days)</Label>
            <Input type="number" value={validity} onChange={e => setValidity(parseInt(e.target.value) || 30)} />
          </div>
        </div>
        {/* Margin display */}
        {totalVendorCostUsd > 0 && quotationPriceUsd > 0 && (
          <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Margin (excl. commission)</p>
              <p className={cn('text-lg font-bold', totalProfit >= 0 ? 'text-[hsl(var(--chart-2))]' : 'text-destructive')}>
                {Math.round(((quotationPriceUsd - totalVendorCostUsd) / totalVendorCostUsd) * 10000) / 100}%
              </p>
              <p className="text-xs">{formatUSD(totalProfit)} | {formatIQD(totalProfit * fxRate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin (incl. commission)</p>
              <p className={cn('text-lg font-bold', profitAfterComm >= 0 ? 'text-[hsl(var(--chart-2))]' : 'text-destructive')}>
                {Math.round(marginWithCommPct * 100) / 100}%
              </p>
              <p className="text-xs">{formatUSD(profitAfterComm)} | {formatIQD(profitAfterComm * fxRate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Service Fee (25% of profit)</p>
              <p className="font-mono font-medium">{formatUSD(serviceFeeUsd)}</p>
              <p className="text-xs text-muted-foreground">{formatIQD(serviceFeeUsd * fxRate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Profit (75%)</p>
              <p className="font-mono font-medium">{formatUSD(netProfitUsd)}</p>
              <p className="text-xs text-muted-foreground">{formatIQD(netProfitUsd * fxRate)}</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Payment Terms */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-sm font-semibold mb-3">💳 Payment Terms</p>
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
              <th className="text-right py-2 font-medium text-muted-foreground w-16">%</th>
              <th className="text-right py-2 font-medium text-muted-foreground">USD</th>
              <th className="text-right py-2 font-medium text-muted-foreground">IQD</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {paymentTerms.map((t, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2">{t.description}</td>
                <td className="py-2 text-right font-mono">{t.percentage}%</td>
                <td className="py-2 text-right font-mono">{formatUSD(quotationPriceUsd * (t.percentage / 100))}</td>
                <td className="py-2 text-right font-mono text-muted-foreground">{formatIQD(quotationPriceUsd * (t.percentage / 100) * fxRate)}</td>
                <td className="py-2"><Button variant="ghost" size="sm" onClick={() => removePaymentTerm(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Input placeholder="Term description" value={newTerm.description} onChange={e => setNewTerm(p => ({ ...p, description: e.target.value }))} className="flex-1" />
          <Input type="number" placeholder="%" value={newTerm.percentage || ''} onChange={e => setNewTerm(p => ({ ...p, percentage: parseFloat(e.target.value) || 0 }))} className="w-20" />
          <Button variant="outline" size="sm" onClick={addPaymentTerm}><Plus className="w-3 h-3" /></Button>
        </div>
        <p className={cn('text-xs mt-2 font-medium', totalTermsPct === 100 ? 'text-[hsl(var(--chart-2))]' : 'text-destructive')}>
          Total: {totalTermsPct}% {totalTermsPct !== 100 && '⚠ Must equal 100%'}
        </p>
      </div>

      {/* 4. Service Breakdown */}
      {serviceBreakdown.length > 0 && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm font-semibold mb-3">📄 Service Breakdown (Customer View)</p>
          <div className="erp-table-container">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-primary text-primary-foreground">
                <th className="text-left px-3 py-2">Service</th>
                <th className="text-right px-3 py-2">Quoted Price USD</th>
                <th className="text-right px-3 py-2">Quoted Price IQD</th>
              </tr></thead>
              <tbody>
                {serviceBreakdown.map((svc: any, i: number) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-3 py-2">{svc.description || svc.category || 'Service'}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatUSD(svc.quoted_price_usd)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(svc.quoted_price_iqd)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border bg-accent/30">
                  <td className="px-3 py-2 font-medium">Service Fee</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{formatUSD(serviceFeeUsd)}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(serviceFeeUsd * fxRate)}</td>
                </tr>
                <tr className="bg-muted/50 font-semibold">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right font-mono">{formatUSD(quotationPriceUsd)}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(quotationPriceUsd * fxRate)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Internal Breakdown (collapsible) */}
          <details className="mt-3">
            <summary className="text-xs font-semibold cursor-pointer text-muted-foreground">🔍 Internal Breakdown (Vendor Cost | Fee | Quoted)</summary>
            <div className="erp-table-container mt-2">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-2 py-1 font-medium text-muted-foreground">Service</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Vendor USD</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Vendor IQD</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Fee USD</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Fee IQD</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Quoted USD</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Quoted IQD</th>
                </tr></thead>
                <tbody>
                  {serviceBreakdown.map((svc: any, i: number) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-2 py-1">{svc.description || svc.category || 'Service'}</td>
                      <td className="px-2 py-1 text-right font-mono">{formatUSD(svc.vendor_cost_usd)}</td>
                      <td className="px-2 py-1 text-right font-mono text-muted-foreground">{formatIQD(svc.vendor_cost_iqd)}</td>
                      <td className="px-2 py-1 text-right font-mono">{formatUSD(svc.service_fee_usd)}</td>
                      <td className="px-2 py-1 text-right font-mono text-muted-foreground">{formatIQD(svc.service_fee_iqd)}</td>
                      <td className="px-2 py-1 text-right font-mono font-medium">{formatUSD(svc.quoted_price_usd)}</td>
                      <td className="px-2 py-1 text-right font-mono text-muted-foreground">{formatIQD(svc.quoted_price_iqd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* 5. Quotation Description */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-sm font-semibold mb-2">📝 Quotation Description / Terms & Conditions</p>
        <Textarea value={quotationDescription} onChange={e => setQuotationDescription(e.target.value)} rows={3} placeholder="Enter terms and conditions..." />
      </div>

      {/* 6. Quotation Summary */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-sm font-semibold mb-3">📋 Quotation Summary</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Quotation Price</p>
            <p className="text-lg font-semibold">{formatUSD(quotationPriceUsd)}</p>
            <p className="text-xs text-muted-foreground">{formatIQD(quotationPriceUsd * fxRate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Cost (Vendor)</p>
            <p className="text-lg font-semibold">{formatUSD(totalVendorCostUsd)}</p>
            <p className="text-xs text-muted-foreground">{formatIQD(totalVendorCostIqd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profit</p>
            <p className={cn('text-lg font-semibold', totalProfit >= 0 ? 'text-[hsl(var(--chart-2))]' : 'text-destructive')}>{formatUSD(totalProfit)}</p>
            <p className="text-xs text-muted-foreground">{formatIQD(totalProfit * fxRate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Margin %</p>
            <p className="text-lg font-semibold">{Math.round(marginPct * 100) / 100}%</p>
            <p className="text-xs text-muted-foreground">Service Fee ÷ Cost</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">FX Rate & Date</p>
            <p className="text-lg font-semibold">{fxRate.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{fxDate}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-primary/10 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-xs text-muted-foreground">Service Fee (25%)</span><p className="font-mono">{formatUSD(serviceFeeUsd)}</p><p className="text-xs text-muted-foreground">{formatIQD(serviceFeeUsd * fxRate)}</p></div>
          <div><span className="text-xs text-muted-foreground">Net Profit (75%)</span><p className="font-mono">{formatUSD(netProfitUsd)}</p><p className="text-xs text-muted-foreground">{formatIQD(netProfitUsd * fxRate)}</p></div>
          <div><span className="text-xs text-muted-foreground">Commissions</span><p className="font-mono">{formatUSD(totalCommUsd)}</p><p className="text-xs text-muted-foreground">{formatIQD(totalCommIqd)}</p></div>
          <div><span className="text-xs text-muted-foreground">Final Profit</span><p className={cn('font-mono font-semibold', finalProfitUsd >= 0 ? 'text-[hsl(var(--chart-2))]' : 'text-destructive')}>{formatUSD(finalProfitUsd)}</p><p className="text-xs text-muted-foreground">{formatIQD(finalProfitUsd * fxRate)}</p></div>
        </div>
      </div>

      {/* 7. Template Selection */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-sm font-semibold mb-3">📋 Template Selection</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quotationTemplates.length > 0 ? (
            quotationTemplates.map((t: any) => (
              <button key={t.id} onClick={() => setSelectedTemplateId(t.id)}
                className={cn('p-3 rounded-lg border text-left transition-all',
                  selectedTemplateId === t.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
                )}>
                <p className="text-sm font-medium">{t.template_name}</p>
                <div className="flex gap-2 mt-1">
                  {t.is_default && <span className="text-xs text-muted-foreground">Default</span>}
                  {t.is_standard && <span className="text-xs text-primary">Standard</span>}
                </div>
                {t.company_slogan && <p className="text-xs text-muted-foreground mt-1">{t.company_slogan}</p>}
              </button>
            ))
          ) : (
            <div className="col-span-3 text-sm text-muted-foreground">No templates found. Using default template. Add templates in Settings → Templates.</div>
          )}
        </div>
      </div>

      {/* Existing quotation status */}
      {quotations.length > 0 && (
        <div className="p-3 rounded-lg bg-accent text-sm">
          ✅ Quotation {quotations[0].quote_no} generated ({quotations[0].status})
        </div>
      )}

      {/* Actions: Generate, Preview, Download, Send */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerate} disabled={insertQuotation.isPending} size="lg">
          <FileDown className="w-4 h-4 mr-2" />{quotations.length > 0 ? 'Regenerate' : 'Generate'} Quotation PDF
        </Button>
        {quotations.length > 0 && (
          <>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="w-4 h-4 mr-2" />Preview
            </Button>
            <Button variant="outline" onClick={handlePreviewDownload}>
              <FileDown className="w-4 h-4 mr-2" />Download PDF
            </Button>
            <Button variant="secondary" onClick={handleSendToCustomer}>
              <Send className="w-4 h-4 mr-2" />Send to Customer
            </Button>
          </>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation Preview — {quotations[0]?.quote_no || 'Draft'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-bold">{company.company_name || 'FreightFlow Logistics'}</p>
                <p className="text-xs text-muted-foreground">{company.company_slogan || ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Quotation #</p>
                <p className="font-mono font-medium">{quotations[0]?.quote_no || 'Draft'}</p>
                <p className="text-xs text-muted-foreground mt-1">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Customer</p>
              <p className="font-semibold">{customer.company || customerName}</p>
              {customer.contact_name && <p className="text-xs">Contact: {customer.contact_name}</p>}
              {customer.phone && <p className="text-xs">Phone: {customer.phone}</p>}
              {customer.email && <p className="text-xs">Email: {customer.email}</p>}
              {customer.address && <p className="text-xs">Address: {customer.address}{customer.city ? `, ${customer.city}` : ''}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div><p className="text-xs text-muted-foreground">Order</p><p className="font-medium">{order.order_no}</p></div>
              <div><p className="text-xs text-muted-foreground">Route</p><p>{order.origin_city || order.origin_country} → {order.destination_city || order.destination_country}</p></div>
              <div><p className="text-xs text-muted-foreground">Mode / Incoterm</p><p className="uppercase">{order.mode} {order.incoterm ? `/ ${order.incoterm}` : ''}</p></div>
              <div><p className="text-xs text-muted-foreground">Cargo</p><p>{order.cargo_desc || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">ETD / ETA</p><p>{order.etd || '—'} → {order.eta || '—'}</p></div>
              {order.container_type && <div><p className="text-xs text-muted-foreground">Container</p><p>{order.container_type}</p></div>}
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-semibold">FX Rate: {fxRate.toLocaleString()} USD/IQD — Date: {fxDate}</p>
            </div>

            <table className="w-full text-sm border border-border">
              <thead><tr className="bg-primary text-primary-foreground">
                <th className="px-3 py-2 text-left">Service</th>
                <th className="px-3 py-2 text-right">Quoted Price USD</th>
                <th className="px-3 py-2 text-right">Quoted Price IQD</th>
              </tr></thead>
              <tbody>
                {serviceBreakdown.map((svc: any, i: number) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-3 py-2">{svc.description || svc.category || 'Service'}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{formatUSD(svc.quoted_price_usd)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(svc.quoted_price_iqd)}</td>
                  </tr>
                ))}
                <tr className="bg-accent/30 border-b border-border">
                  <td className="px-3 py-2 font-medium">Service Fee</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{formatUSD(serviceFeeUsd)}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(serviceFeeUsd * fxRate)}</td>
                </tr>
                <tr className="font-semibold bg-muted/50">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right font-mono">{formatUSD(quotationPriceUsd)}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(quotationPriceUsd * fxRate)}</td>
                </tr>
              </tbody>
            </table>

            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-semibold mb-2">Payment Terms</p>
              {paymentTerms.map((t, i) => (
                <p key={i} className="text-xs">{t.description}: {t.percentage}% — {formatUSD(quotationPriceUsd * (t.percentage / 100))} | {formatIQD(quotationPriceUsd * (t.percentage / 100) * fxRate)}</p>
              ))}
            </div>

            {quotationDescription && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-semibold mb-1">Terms & Conditions</p>
                <p className="text-xs whitespace-pre-wrap">{quotationDescription}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Validity: {validity} days from date of issue (expires {new Date(Date.now() + validity * 86400000).toLocaleDateString()}). FX Rate: {fxRate.toLocaleString()} USD/IQD ({fxDate}).
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <Button onClick={handlePreviewDownload}><FileDown className="w-4 h-4 mr-2" />Download PDF</Button>
            <Button variant="secondary" onClick={handleSendToCustomer}><Send className="w-4 h-4 mr-2" />Send to Customer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Step5({ quotations }: any) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const latestQuotation = quotations[0];

  const handleUploadSignedPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !latestQuotation) return;
    if (file.type !== 'application/pdf') { toast.error('Please upload a PDF file'); return; }

    setUploading(true);
    try {
      const filePath = `${latestQuotation.id}/${Date.now()}-signed.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('signed-quotations')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('signed-quotations')
        .getPublicUrl(filePath);

      await (supabase.from('quotations') as any).update({
        signed_pdf_url: publicUrlData.publicUrl,
        status: 'approved',
        approved_at: new Date().toISOString(),
      }).eq('id', latestQuotation.id);

      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Signed PDF uploaded & quotation approved');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Step 5 — Quotation Approval</h3>
      {quotations.length === 0 ? (
        <p className="text-muted-foreground">Generate a quotation in Step 4 first.</p>
      ) : (
        <>
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm font-semibold mb-1">Quotation: {latestQuotation.quote_no}</p>
            <p className="text-sm text-muted-foreground capitalize">Status: {latestQuotation.status}</p>
            {latestQuotation.approved_at && <p className="text-xs text-muted-foreground mt-1">Approved: {new Date(latestQuotation.approved_at).toLocaleDateString()}</p>}
          </div>

          {latestQuotation.signed_pdf_url ? (
            <div className="p-4 bg-accent rounded-lg space-y-2">
              <p className="text-sm font-medium">✅ Signed PDF uploaded</p>
              <a href={latestQuotation.signed_pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View Signed PDF</a>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <p className="text-muted-foreground mb-4">Upload signed quotation from customer to approve</p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleUploadSignedPdf}
                className="hidden"
                id="signed-pdf-upload"
              />
              <label htmlFor="signed-pdf-upload">
                <Button variant="outline" className="cursor-pointer" disabled={uploading} asChild>
                  <span>{uploading ? 'Uploading...' : 'Upload Signed PDF'}</span>
                </Button>
              </label>
            </div>
          )}

          {/* Re-upload option even if already uploaded */}
          {latestQuotation.signed_pdf_url && (
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleUploadSignedPdf}
                className="hidden"
                id="signed-pdf-reupload"
              />
              <label htmlFor="signed-pdf-reupload">
                <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploading} asChild>
                  <span>{uploading ? 'Uploading...' : 'Re-upload Signed PDF'}</span>
                </Button>
              </label>
            </div>
          )}
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

function Step7({ order, quotations, costs, invoices, vendorBills, insertInvoice, insertBill, customerName, vendors, payments, customers }: any) {
  const queryClient = useQueryClient();
  const quotation = quotations[0];
  const fxRate = quotation?.fx_rate || DEFAULT_FX_RATE;
  const customer = customers?.find((c: any) => c.id === order.customer_id) || {};

  // Fetch quotation payment terms
  const { data: quotationPaymentTerms = [] } = useQuery({
    queryKey: ['quotation_payment_terms', quotation?.id],
    queryFn: async () => {
      if (!quotation?.id) return [];
      const { data, error } = await (supabase.from('quotation_payment_terms') as any).select('*').eq('quotation_id', quotation.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!quotation?.id,
  });

  // Vendor costs (exclude commission/incentive)
  const vendorCosts = costs.filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive');
  const commCosts = costs.filter((c: any) => c.category === 'partner_commission' || c.category === 'employee_incentive');

  // Payment intents info
  const arPayments = payments.filter((p: any) => p.direction === 'AR');
  const apPayments = payments.filter((p: any) => p.direction === 'AP');

  // Totals
  const totalArUsd = invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
  const totalApUsd = vendorBills.reduce((s: number, b: any) => s + (b.amount_usd || 0), 0);
  const profitUsd = totalArUsd - totalApUsd;

  const handleGenerateInvoice = async () => {
    if (!quotation) { toast.error('Generate quotation first'); return; }
    const year = new Date().getFullYear();
    const invNo = `INV-${order.order_no}`;
    await insertInvoice.mutateAsync({
      invoice_no: invNo, order_id: order.id, customer_id: order.customer_id,
      status: 'issued', amount_usd: quotation.total_usd, amount_iqd: quotation.total_iqd,
      fx_rate: fxRate, fx_date: quotation.fx_date, is_fx_locked: true,
      issued_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    });
    toast.success('Invoice generated');
  };

  const handleGenerateBills = async () => {
    const vendorGroups: Record<string, any[]> = {};
    vendorCosts.forEach((c: any) => { if (c.vendor_id) { if (!vendorGroups[c.vendor_id]) vendorGroups[c.vendor_id] = []; vendorGroups[c.vendor_id].push(c); } });
    // Also add commission/incentive costs as INTERNAL_PAYABLES
    const internalCosts = commCosts.filter((c: any) => c.amount_usd > 0);

    const year = new Date().getFullYear();
    let idx = vendorBills.length;
    for (const [vendorId, vCosts] of Object.entries(vendorGroups)) {
      idx++;
      const totalUsd = (vCosts as any[]).reduce((s: number, c: any) => s + c.amount_usd, 0);
      const totalIqd = (vCosts as any[]).reduce((s: number, c: any) => s + c.amount_iqd, 0);
      const billNo = `BILL-${order.order_no}`;
      await insertBill.mutateAsync({
        bill_no: billNo, order_id: order.id, vendor_id: vendorId,
        status: 'issued', amount_usd: totalUsd, amount_iqd: totalIqd,
        fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0], is_fx_locked: true,
        issued_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
    }

    // Generate internal payable bills for commissions
    for (const ic of internalCosts) {
      idx++;
      const billNo = `BILL-${order.order_no}`;
      await insertBill.mutateAsync({
        bill_no: billNo, order_id: order.id, vendor_id: null,
        status: 'issued', amount_usd: ic.amount_usd, amount_iqd: ic.amount_iqd,
        fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0], is_fx_locked: true,
        issued_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
    }

    toast.success('Vendor bills generated');
  };

  const handleDownloadInvoicePdf = (inv: any) => {
    generateInvoicePDF({
      invoiceNo: inv.invoice_no, customerName, order,
      totalUsd: inv.amount_usd, totalIqd: inv.amount_iqd,
      fxRate: inv.fx_rate, fxDate: inv.fx_date,
    });
  };

  const handleDownloadBillPdf = (bill: any) => {
    const billCosts = vendorCosts.filter((c: any) => c.vendor_id === bill.vendor_id);
    const vendorName = vendors.find((v: any) => v.id === bill.vendor_id)?.company || 'INTERNAL_PAYABLES';
    generateVendorBillPDF({
      billNo: bill.bill_no, vendorName, order,
      totalUsd: bill.amount_usd, totalIqd: bill.amount_iqd,
      fxRate: bill.fx_rate, fxDate: bill.fx_date, costs: billCosts,
    });
  };

  const hasInvoices = invoices.length > 0;
  const hasBills = vendorBills.length > 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Step 7 — Issue Docs AR/AP</h3>
      <p className="text-sm text-muted-foreground">Auto create invoices & vendor bills</p>

      {/* Payment Intents Created */}
      {(hasInvoices || hasBills) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
          <p className="text-sm font-medium flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center text-blue-500 text-xs">○</span>
            Payment Intents Created
          </p>
          {hasInvoices && (
            <p className="text-xs text-muted-foreground ml-7">• {invoices.length} AR PaymentIntent(s): {invoices.map((i: any) => `PI: ${i.invoice_no}`).join(', ')}</p>
          )}
          {hasBills && (
            <p className="text-xs text-muted-foreground ml-7">• {vendorBills.length} AP PaymentIntent(s): {vendorBills.map((b: any) => `PI: ${b.bill_no}`).join(', ')}</p>
          )}
          <p className="text-xs text-muted-foreground ml-7">✓ Payments can now be recorded in Step 7 without risk of duplication</p>
        </div>
      )}

      {/* Warning to issue docs */}
      {(!hasInvoices || !hasBills) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">⚠ Issue Invoices (AR) and vendor bills (AP) to proceed</p>
        </div>
      )}

      {/* Generate buttons */}
      {(!hasInvoices || !hasBills) && (
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={handleGenerateInvoice} disabled={insertInvoice.isPending || !quotation || hasInvoices}>
            <FileDown className="w-4 h-4 mr-2" />Generate Invoice
          </Button>
          <Button variant="outline" onClick={handleGenerateBills} disabled={insertBill.isPending || costs.length === 0 || hasBills}>
            <FileDown className="w-4 h-4 mr-2" />Generate Vendor Bills
          </Button>
        </div>
      )}

      {/* ===== INVOICES (AR) ===== */}
      {hasInvoices && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center"><span className="text-xs font-bold text-blue-700">$</span></div>
            <h4 className="text-sm font-semibold">Invoices (AR)</h4>
          </div>

          {invoices.map((inv: any) => {
            const dueUsd = (inv.amount_usd || 0) - (inv.paid_usd || 0);
            return (
              <div key={inv.id} className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 flex justify-between items-start">
                  <div>
                    <p className="font-mono font-semibold text-base">{inv.invoice_no}</p>
                    <p className="text-xs text-muted-foreground">{formatUSD(inv.amount_usd)}</p>
                    <p className="text-xs text-muted-foreground">Issued: {inv.issued_date} • Due: {inv.due_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{formatUSD(inv.amount_usd)}</p>
                    <p className="text-xs text-muted-foreground">Due: {formatUSD(dueUsd)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
                <div className="border-t border-border px-4 py-2 flex gap-2 bg-muted/30">
                  <Button variant="ghost" size="sm" onClick={() => toast.info('Open invoice view')}>
                    <Eye className="w-3.5 h-3.5 mr-1" />Open Invoice
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoicePdf(inv)}>
                    <FileDown className="w-3.5 h-3.5 mr-1" />Download PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.print()}>
                    🖨 Print
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}>
                    🔄
                  </Button>
                </div>
              </div>
            );
          })}

          {/* AR Payment Terms */}
          {quotationPaymentTerms.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">AR Payment Terms</h4>
              <div className="erp-table-container">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Term #</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Paid</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Due</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
                  </tr></thead>
                  <tbody>
                    {quotationPaymentTerms.map((term: any, idx: number) => {
                      const termAmountUsd = term.amount_usd || (quotation?.total_usd || 0) * ((term.percentage || 0) / 100);
                      // Find matching AR payments for this term
                      const paidUsd = idx < arPayments.length ? arPayments[idx]?.amount_usd || 0 : 0;
                      const dueUsd = termAmountUsd - paidUsd;
                      const termStatus = paidUsd >= termAmountUsd ? 'paid' : paidUsd > 0 ? 'partial' : 'pending';
                      return (
                        <tr key={term.id} className="border-b border-border">
                          <td className="px-4 py-2">{term.percentage || idx + 1}</td>
                          <td className="px-4 py-2 text-muted-foreground">{invoices[0]?.due_date || '—'}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatUSD(termAmountUsd)}</td>
                          <td className="px-4 py-2 text-right font-mono text-emerald-600">{formatUSD(paidUsd)}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatUSD(dueUsd)}</td>
                          <td className="px-4 py-2 text-center"><StatusBadge status={termStatus} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== VENDOR BILLS (AP) ===== */}
      {hasBills && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center"><span className="text-xs font-bold text-amber-700">📋</span></div>
            <h4 className="text-sm font-semibold">Vendor Bills (AP)</h4>
          </div>

          <div className="erp-table-container">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bill #</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Vendor</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Due Date</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Due</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {vendorBills.map((bill: any) => {
                  const vendorName = vendors.find((v: any) => v.id === bill.vendor_id)?.company || 'INTERNAL_PAYABLES';
                  const dueUsd = (bill.amount_usd || 0) - (bill.paid_usd || 0);
                  const billStatus = (bill.paid_usd || 0) >= bill.amount_usd ? 'paid' : (bill.paid_usd || 0) > 0 ? 'partial' : bill.status;
                  return (
                    <tr key={bill.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-mono font-medium text-primary cursor-pointer" onClick={() => handleDownloadBillPdf(bill)}>{bill.bill_no}</td>
                      <td className="px-4 py-2">{vendorName}</td>
                      <td className="px-4 py-2 text-muted-foreground">{bill.issued_date || '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{bill.due_date || '—'}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatUSD(bill.amount_usd)}</td>
                      <td className="px-4 py-2 text-right font-mono text-orange-600">{formatUSD(dueUsd)}</td>
                      <td className="px-4 py-2 text-center"><StatusBadge status={billStatus} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* AP Payment Terms */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">AP Payment Terms</h4>
            <div className="erp-table-container">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Term #</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Due Date</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Paid</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Due</th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {vendorBills.map((bill: any, idx: number) => {
                    const paidUsd = bill.paid_usd || 0;
                    const dueUsd = (bill.amount_usd || 0) - paidUsd;
                    const termStatus = paidUsd >= bill.amount_usd ? 'paid' : paidUsd > 0 ? 'partial' : 'pending';
                    return (
                      <tr key={bill.id} className="border-b border-border">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2 text-muted-foreground">{bill.due_date || '—'}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatUSD(bill.amount_usd)}</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-600">{formatUSD(paidUsd)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatUSD(dueUsd)}</td>
                        <td className="px-4 py-2 text-center"><StatusBadge status={termStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUMMARY FOOTER ===== */}
      {(hasInvoices || hasBills) && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-emerald-50 via-amber-50 to-emerald-50 rounded-lg border border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total AR</p>
            <p className="text-lg font-bold text-emerald-600">{formatUSD(totalArUsd)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total AP</p>
            <p className="text-lg font-bold text-red-500">{formatUSD(totalApUsd)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Profit</p>
            <p className={`text-lg font-bold ${profitUsd >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatUSD(profitUsd)}</p>
          </div>
        </div>
      )}

      {/* Go to Accounting Center */}
      <div className="text-center">
        <Button variant="outline" onClick={() => toast.info('Accounting center coming soon')}>
          📊 Go to Accounting Center ↗
        </Button>
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
