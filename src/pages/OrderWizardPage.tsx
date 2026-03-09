import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Lock, LockOpen, Plus, Trash2, FileDown, Eye, Send, Upload, Printer, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge'; // v2
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

  // Step validation logic
  const getStepValidation = (stepNum: number): { canAdvance: boolean; message: string } => {
    switch (stepNum) {
      case 1:
        if (!order.customer_id) return { canAdvance: false, message: 'Customer is required' };
        if (!order.mode) return { canAdvance: false, message: 'Transport mode is required' };
        if (!order.direction) return { canAdvance: false, message: 'Direction is required' };
        if (!order.origin_country) return { canAdvance: false, message: 'Origin country is required' };
        if (!order.destination_country) return { canAdvance: false, message: 'Destination country is required' };
        if (!order.responsible_employee_id) return { canAdvance: false, message: 'Responsible employee is required' };
        return { canAdvance: true, message: '' };
      case 2:
        if (!order.cargo_desc) return { canAdvance: false, message: 'Cargo description is required' };
        if (!order.weight) return { canAdvance: false, message: 'Weight is required' };
        if (!order.etd) return { canAdvance: false, message: 'ETD is required' };
        if (!order.eta) return { canAdvance: false, message: 'ETA is required' };
        return { canAdvance: true, message: '' };
      case 3:
        if (costs.filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive').length === 0)
          return { canAdvance: false, message: 'Add at least one vendor cost' };
        return { canAdvance: true, message: '' };
      case 4:
        if (quotations.length === 0) return { canAdvance: false, message: 'Create at least one quotation' };
        return { canAdvance: true, message: '' };
      case 5: {
        const hasApproved = quotations.some((q: any) => q.status === 'approved');
        if (!hasApproved) return { canAdvance: false, message: 'At least one quotation must be approved' };
        return { canAdvance: true, message: '' };
      }
      case 6:
        if (!order.carrier_name) return { canAdvance: false, message: 'Carrier name is required' };
        return { canAdvance: true, message: '' };
      case 7:
        if (invoices.length === 0) return { canAdvance: false, message: 'Generate at least one invoice' };
        if (vendorBills.length === 0) return { canAdvance: false, message: 'Generate at least one vendor bill' };
        return { canAdvance: true, message: '' };
      case 8: {
        const outstandingAR = invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0) - (i.paid_usd || 0), 0);
        const outstandingAP = vendorBills.reduce((s: number, b: any) => s + (b.amount_usd || 0) - (b.paid_usd || 0), 0);
        if (outstandingAR > 0.01) return { canAdvance: false, message: `Outstanding AR: ${formatUSD(outstandingAR)} — all invoices must be fully paid` };
        if (outstandingAP > 0.01) return { canAdvance: false, message: `Outstanding AP: ${formatUSD(outstandingAP)} — all bills must be fully paid` };
        return { canAdvance: true, message: '' };
      }
      default:
        return { canAdvance: true, message: '' };
    }
  };

  const currentValidation = getStepValidation(currentStep);

  const advanceStep = async () => {
    if (currentStep >= 9) return;
    if (!currentValidation.canAdvance) {
      toast.error(currentValidation.message);
      return;
    }
    await saveOrderField({ status_step: currentStep + 1 });
    setCurrentStep(s => s + 1);
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
      <div className="erp-metric-card min-h-[400px] relative">
        {/* Locked overlay for Steps 1-8 when order is closed */}
        {order.closed_at && currentStep < 9 && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center p-6">
              <Lock className="w-8 h-8 text-amber-500" />
              <p className="font-semibold text-foreground">Order Locked</p>
              <p className="text-sm text-muted-foreground max-w-sm">This order was closed on {order.closed_at?.split('T')[0]}. No further modifications are allowed.</p>
            </div>
          </div>
        )}
        {currentStep === 1 && <Step1 order={order} customers={customers} employees={employees} onSave={saveOrderField} />}
        {currentStep === 2 && <Step2 order={order} onSave={saveOrderField} />}
        {currentStep === 3 && <Step3 orderId={order.id} costs={costs} vendors={vendors} partners={partners} employees={employees} order={order} insertCost={insertCost} deleteCost={deleteCost} />}
        {currentStep === 4 && <Step4 order={order} costs={costs} quotations={quotations} insertQuotation={insertQuotation} customerName={customerName} customers={customers} partners={partners} employees={employees} quotationTemplates={quotationTemplates} companySettings={companySettings} />}
        {currentStep === 5 && <Step5 quotations={quotations} />}
        {currentStep === 6 && <Step6 order={order} onSave={saveOrderField} />}
        {currentStep === 7 && <Step7 order={order} quotations={quotations} costs={costs} invoices={invoices} vendorBills={vendorBills} insertInvoice={insertInvoice} insertBill={insertBill} customerName={customerName} vendors={vendors} payments={payments} customers={customers} employees={employees} partners={partners} companySettings={companySettings} />}
        {currentStep === 8 && <Step8 invoices={invoices} vendorBills={vendorBills} orderId={order.id} vendors={vendors} customers={customers} />}
        {currentStep === 9 && <Step9 order={order} costs={costs} invoices={invoices} vendorBills={vendorBills} payments={payments} employees={employees} partners={partners} onSave={saveOrderField} />}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" disabled={currentStep === 1} onClick={() => setCurrentStep(s => s - 1)}>Previous</Button>
        {currentStep === order.status_step && currentStep < 9 && (
          <div className="flex items-center gap-3">
            {!currentValidation.canAdvance && (
              <div className="flex items-center gap-1.5 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{currentValidation.message}</span>
              </div>
            )}
            <Button onClick={advanceStep} disabled={!currentValidation.canAdvance}>
              Complete Step & Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
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

function Step7({ order, quotations, costs, invoices, vendorBills, insertInvoice, insertBill, customerName, vendors, payments, customers, employees, partners, companySettings }: any) {
  const queryClient = useQueryClient();
  const updateInvoice = useUpdateMutation('invoices');
  const updateBill = useUpdateMutation('vendor_bills');
  const quotation = quotations[0];
  const fxRate = quotation?.fx_rate || DEFAULT_FX_RATE;
  const customer = customers?.find((c: any) => c.id === order.customer_id) || {};
  const company = companySettings?.[0] || {};

  // Fetch quotation payment terms & services
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

  const { data: quotationServices = [] } = useQuery({
    queryKey: ['quotation_services', quotation?.id],
    queryFn: async () => {
      if (!quotation?.id) return [];
      const { data, error } = await (supabase.from('quotation_services') as any).select('*').eq('quotation_id', quotation.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!quotation?.id,
  });

  const { data: paymentMethods = [] } = useTableQuery<any>('payment_methods');

  // Separate cost categories
  const vendorCosts = costs.filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive');
  const partnerCommCosts = costs.filter((c: any) => c.category === 'partner_commission');
  const employeeIncentiveCosts = costs.filter((c: any) => c.category === 'employee_incentive');
  const totalCommUsd = [...partnerCommCosts, ...employeeIncentiveCosts].reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const totalCommIqd = [...partnerCommCosts, ...employeeIncentiveCosts].reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);

  // Payment intents info
  const arPayments = payments.filter((p: any) => p.direction === 'AR');
  const apPayments = payments.filter((p: any) => p.direction === 'AP');

  // Totals
  const totalArUsd = invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
  const totalArIqd = invoices.reduce((s: number, i: any) => s + (i.amount_iqd || 0), 0);
  const totalArPaidUsd = invoices.reduce((s: number, i: any) => s + (i.paid_usd || 0), 0);
  const totalArDueUsd = totalArUsd - totalArPaidUsd;
  const totalApUsd = vendorBills.reduce((s: number, b: any) => s + (b.amount_usd || 0), 0);
  const totalApIqd = vendorBills.reduce((s: number, b: any) => s + (b.amount_iqd || 0), 0);
  const totalApPaidUsd = vendorBills.reduce((s: number, b: any) => s + (b.paid_usd || 0), 0);
  const totalApDueUsd = totalApUsd - totalApPaidUsd;
  const grossProfitUsd = totalArUsd - totalApUsd - totalCommUsd;
  const marginPct = totalArUsd > 0 ? (grossProfitUsd / totalArUsd) * 100 : 0;

  // Invoice state
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date(Date.now() + (customer.payment_terms_days || 30) * 86400000).toISOString().split('T')[0]);
  const [invoiceLineItems, setInvoiceLineItems] = useState<{ description: string; qty: number; unit: string; unitPrice: number }[]>([]);
  const [invoiceTaxRate, setInvoiceTaxRate] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoicePaymentInstructions, setInvoicePaymentInstructions] = useState('');
  const [billingAddress, setBillingAddress] = useState(customer.address ? `${customer.address}${customer.city ? `, ${customer.city}` : ''}` : '');

  // Bill state
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billTaxRate, setBillTaxRate] = useState(0);
  const [billNotes, setBillNotes] = useState('');
  const [showAddBillForm, setShowAddBillForm] = useState(false);
  const [manualBillVendorId, setManualBillVendorId] = useState('');
  const [manualBillDueDate, setManualBillDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [manualBillLineItems, setManualBillLineItems] = useState<{ description: string; qty: number; unit: string; unitCost: number }[]>([{ description: '', qty: 1, unit: 'Service', unitCost: 0 }]);

  const addManualBillLineItem = () => setManualBillLineItems(prev => [...prev, { description: '', qty: 1, unit: 'Service', unitCost: 0 }]);
  const removeManualBillLineItem = (idx: number) => setManualBillLineItems(prev => prev.filter((_, i) => i !== idx));
  const updateManualBillLineItem = (idx: number, field: string, value: any) => {
    setManualBillLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
  };
  const manualBillSubtotal = manualBillLineItems.reduce((s, li) => s + li.qty * li.unitCost, 0);
  const manualBillTaxAmount = manualBillSubtotal * (billTaxRate / 100);
  const manualBillTotal = manualBillSubtotal + manualBillTaxAmount;

  // Populate invoice line items from quotation services
  useEffect(() => {
    if (quotationServices.length > 0 && invoiceLineItems.length === 0) {
      setInvoiceLineItems(quotationServices.map((svc: any) => ({
        description: svc.service_name,
        qty: 1,
        unit: 'Service',
        unitPrice: svc.quoted_price_usd || 0,
      })));
    }
  }, [quotationServices]);

  const invoiceSubtotal = invoiceLineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
  const invoiceTaxAmount = invoiceSubtotal * (invoiceTaxRate / 100);
  const invoiceTotal = invoiceSubtotal + invoiceTaxAmount;

  const addInvoiceLineItem = () => setInvoiceLineItems(prev => [...prev, { description: '', qty: 1, unit: 'Service', unitPrice: 0 }]);
  const removeInvoiceLineItem = (idx: number) => setInvoiceLineItems(prev => prev.filter((_, i) => i !== idx));
  const updateInvoiceLineItem = (idx: number, field: string, value: any) => {
    setInvoiceLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
  };

  const hasInvoices = invoices.length > 0;
  const hasBills = vendorBills.length > 0;

  const handleGenerateInvoice = async () => {
    if (!quotation) { toast.error('Generate quotation first (Step 4)'); return; }
    if (invoiceLineItems.length === 0) { toast.error('Add at least one line item'); return; }
    const year = new Date().getFullYear();
    const totalUsd = invoiceTotal;

    if (quotationPaymentTerms.length > 0) {
      // Generate one invoice per payment term
      let created = 0;
      for (let i = 0; i < quotationPaymentTerms.length; i++) {
        const term = quotationPaymentTerms[i];
        const pct = term.percentage || 0;
        const termUsd = Math.round(totalUsd * (pct / 100) * 100) / 100;
        const termIqd = Math.round(termUsd * fxRate);
        const invNo = `INV-${year}-${String(invoices.length + created + 1).padStart(4, '0')}`;
        // Calculate due date: offset from invoice date based on term index
        const termDueDays = (customer.payment_terms_days || 30) * (i + 1);
        const termDueDate = new Date(new Date(invoiceDate).getTime() + termDueDays * 86400000).toISOString().split('T')[0];
        try {
          await insertInvoice.mutateAsync({
            invoice_no: invNo, order_id: order.id, customer_id: order.customer_id,
            status: 'issued', amount_usd: termUsd, amount_iqd: termIqd,
            fx_rate: fxRate, fx_date: quotation.fx_date || new Date().toISOString().split('T')[0],
            is_fx_locked: true, issued_date: invoiceDate, due_date: termDueDate,
          });
          created++;
        } catch (err: any) {
          toast.error(`Failed to create invoice for term ${i + 1}: ${err.message}`);
        }
      }
      if (created > 0) toast.success(`${created} invoice(s) generated based on payment terms`);
    } else {
      // Single invoice (no payment terms)
      const invNo = `INV-${year}-${String(invoices.length + 1).padStart(4, '0')}`;
      const totalIqd = Math.round(totalUsd * fxRate);
      await insertInvoice.mutateAsync({
        invoice_no: invNo, order_id: order.id, customer_id: order.customer_id,
        status: 'issued', amount_usd: totalUsd, amount_iqd: totalIqd,
        fx_rate: fxRate, fx_date: quotation.fx_date || new Date().toISOString().split('T')[0],
        is_fx_locked: true, issued_date: invoiceDate, due_date: invoiceDueDate,
      });
      toast.success('Invoice generated');
    }
  };

  const handleGenerateBills = async () => {
    const vendorGroups: Record<string, any[]> = {};
    vendorCosts.forEach((c: any) => { if (c.vendor_id) { if (!vendorGroups[c.vendor_id]) vendorGroups[c.vendor_id] = []; vendorGroups[c.vendor_id].push(c); } });

    const year = new Date().getFullYear();
    let idx = vendorBills.length;
    let created = 0;
    for (const [vendorId, vCosts] of Object.entries(vendorGroups)) {
      idx++;
      const totalUsd = (vCosts as any[]).reduce((s: number, c: any) => s + Number(c.amount_usd || 0), 0);
      const vendor = vendors.find((v: any) => v.id === vendorId);
      const vendorDueDays = vendor?.payment_terms_days || 30;
      const billNo = `BILL-${year}-${String(idx).padStart(4, '0')}`;
      const taxAmount = totalUsd * (billTaxRate / 100);
      const finalUsd = totalUsd + taxAmount;
      const finalIqd = Math.round(finalUsd * fxRate);
      try {
        await insertBill.mutateAsync({
          bill_no: billNo, order_id: order.id, vendor_id: vendorId,
          status: 'issued', amount_usd: finalUsd, amount_iqd: finalIqd,
          fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0], is_fx_locked: true,
          issued_date: billDate,
          due_date: new Date(Date.now() + vendorDueDays * 86400000).toISOString().split('T')[0],
        });
        created++;
      } catch (err: any) {
        console.error(`Failed to create bill for vendor ${vendorId}:`, err);
        toast.error(`Failed to create bill for ${vendor?.company || vendorId}: ${err.message}`);
      }
    }
    if (created > 0) toast.success(`${created} vendor bill(s) generated (commissions tracked separately in Finance)`);
  };

  const handleAddManualBill = async () => {
    if (!manualBillVendorId) { toast.error('Select a vendor'); return; }
    if (manualBillLineItems.length === 0 || manualBillTotal <= 0) { toast.error('Add at least one line item with a cost'); return; }
    const year = new Date().getFullYear();
    const billNo = `BILL-${year}-${String(vendorBills.length + 1).padStart(4, '0')}`;
    const totalIqd = Math.round(manualBillTotal * fxRate);
    await insertBill.mutateAsync({
      bill_no: billNo, order_id: order.id, vendor_id: manualBillVendorId,
      status: 'draft', amount_usd: manualBillTotal, amount_iqd: totalIqd,
      fx_rate: fxRate, fx_date: new Date().toISOString().split('T')[0], is_fx_locked: true,
      issued_date: billDate, due_date: manualBillDueDate,
    });
    setManualBillLineItems([{ description: '', qty: 1, unit: 'Service', unitCost: 0 }]);
    setManualBillVendorId('');
    setBillTaxRate(0);
    setBillNotes('');
    setShowAddBillForm(false);
    toast.success('Vendor bill created');
  };

  const handleDownloadInvoicePdf = (inv: any) => {
    generateInvoicePDF({
      invoiceNo: inv.invoice_no, customerName, order,
      totalUsd: inv.amount_usd, totalIqd: inv.amount_iqd,
      fxRate: inv.fx_rate, fxDate: inv.fx_date,
      lineItems: invoiceLineItems, taxRate: invoiceTaxRate,
      paymentTerms: quotationPaymentTerms, notes: invoiceNotes,
      paymentInstructions: invoicePaymentInstructions,
      customer, companyName: company.company_name,
      billingAddress,
      paymentMethods,
    });
  };

  const handleDownloadBillPdf = (bill: any) => {
    const billCosts = vendorCosts.filter((c: any) => c.vendor_id === bill.vendor_id);
    const vendorName = vendors.find((v: any) => v.id === bill.vendor_id)?.company || 'Unknown Vendor';
    generateVendorBillPDF({
      billNo: bill.bill_no, vendorName, order,
      totalUsd: bill.amount_usd, totalIqd: bill.amount_iqd,
      fxRate: bill.fx_rate, fxDate: bill.fx_date, costs: billCosts,
      taxRate: billTaxRate, notes: billNotes,
    });
  };

  const getDaysOverdue = (dueDate: string) => {
    if (!dueDate) return 0;
    const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  };

  const getInvoiceStatus = (inv: any) => {
    if ((inv.paid_usd || 0) >= inv.amount_usd) return 'paid';
    if (inv.due_date && new Date(inv.due_date) < new Date() && (inv.paid_usd || 0) < inv.amount_usd) return 'overdue';
    if ((inv.paid_usd || 0) > 0) return 'partial';
    return inv.status || 'draft';
  };

  const [autoIssuing, setAutoIssuing] = useState(false);

  const handleAutoIssueFromQuotation = async () => {
    if (!quotation) { toast.error('No quotation found. Go to Step 4.'); return; }
    setAutoIssuing(true);
    try {
      const year = new Date().getFullYear();
      const today = new Date().toISOString().split('T')[0];

      // ---- AR: Generate Invoices from Quotation ----
      if (invoices.length === 0) {
        if (quotationPaymentTerms.length > 0) {
          let created = 0;
          for (let i = 0; i < quotationPaymentTerms.length; i++) {
            const term = quotationPaymentTerms[i];
            const pct = term.percentage || 0;
            const termUsd = Math.round((quotation.total_usd || 0) * (pct / 100) * 100) / 100;
            const termIqd = Math.round(termUsd * fxRate);
            const invNo = `INV-${year}-${String(created + 1).padStart(4, '0')}`;
            const termDueDays = (customer.payment_terms_days || 30) * (i + 1);
            const termDueDate = new Date(Date.now() + termDueDays * 86400000).toISOString().split('T')[0];
            await insertInvoice.mutateAsync({
              invoice_no: invNo, order_id: order.id, customer_id: order.customer_id,
              status: 'issued', amount_usd: termUsd, amount_iqd: termIqd,
              fx_rate: fxRate, fx_date: quotation.fx_date || today,
              is_fx_locked: true, issued_date: today, due_date: termDueDate,
            });
            created++;
          }
          toast.success(`${created} invoice(s) auto-generated from payment terms`);
        } else {
          const invNo = `INV-${year}-0001`;
          const totalUsd = quotation.total_usd || 0;
          const totalIqd = quotation.total_iqd || Math.round(totalUsd * fxRate);
          const dueDays = customer.payment_terms_days || 30;
          await insertInvoice.mutateAsync({
            invoice_no: invNo, order_id: order.id, customer_id: order.customer_id,
            status: 'issued', amount_usd: totalUsd, amount_iqd: totalIqd,
            fx_rate: fxRate, fx_date: quotation.fx_date || today,
            is_fx_locked: true, issued_date: today,
            due_date: new Date(Date.now() + dueDays * 86400000).toISOString().split('T')[0],
          });
          toast.success('Invoice auto-generated from quotation total');
        }
      }

      // ---- AP: Generate Vendor Bills from Cost Sheet ----
      if (vendorBills.length === 0 && vendorCosts.length > 0) {
        const vendorGroups: Record<string, any[]> = {};
        vendorCosts.forEach((c: any) => { if (c.vendor_id) { if (!vendorGroups[c.vendor_id]) vendorGroups[c.vendor_id] = []; vendorGroups[c.vendor_id].push(c); } });
        let billIdx = 0;
        for (const [vendorId, vCosts] of Object.entries(vendorGroups)) {
          billIdx++;
          const totalUsd = (vCosts as any[]).reduce((s: number, c: any) => s + Number(c.amount_usd || 0), 0);
          const totalIqd = Math.round(totalUsd * fxRate);
          const vendor = vendors.find((v: any) => v.id === vendorId);
          const dueDays = vendor?.payment_terms_days || 30;
          const billNo = `BILL-${year}-${String(billIdx).padStart(4, '0')}`;
          await insertBill.mutateAsync({
            bill_no: billNo, order_id: order.id, vendor_id: vendorId,
            status: 'issued', amount_usd: totalUsd, amount_iqd: totalIqd,
            fx_rate: fxRate, fx_date: today, is_fx_locked: true,
            issued_date: today,
            due_date: new Date(Date.now() + dueDays * 86400000).toISOString().split('T')[0],
          });
        }
        if (billIdx > 0) toast.success(`${billIdx} vendor bill(s) auto-generated from cost sheet`);
      }

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['vendor_bills'] });
    } catch (err: any) {
      toast.error(`Auto-issue failed: ${err.message}`);
    } finally {
      setAutoIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Step 7 — Issue Documents AR/AP</h3>
      <p className="text-sm text-muted-foreground">Generate invoices for customers and bills for vendors from quotation data. Broker commissions & employee incentives tracked separately in Finance.</p>

      {/* Quick Auto-Issue from Quotation */}
      {!hasInvoices && !hasBills && quotation && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
          <p className="text-sm font-semibold">⚡ Quick Issue — Auto-generate from Quotation</p>
          <p className="text-xs text-muted-foreground">
            This will automatically create invoices from quotation totals/payment terms and vendor bills from the cost sheet.
          </p>
          <div className="text-sm space-y-1">
            <p>• <strong>AR Invoice:</strong> {quotationPaymentTerms.length > 0 ? `${quotationPaymentTerms.length} invoices (by payment terms)` : '1 invoice'} — Total: {formatUSD(quotation.total_usd || 0)}</p>
            <p>• <strong>AP Bills:</strong> {Object.keys(vendorCosts.reduce((g: Record<string, boolean>, c: any) => { if (c.vendor_id) g[c.vendor_id] = true; return g; }, {})).length} vendor bill(s) — Total: {formatUSD(vendorCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0))}</p>
          </div>
          <Button onClick={handleAutoIssueFromQuotation} disabled={autoIssuing} size="lg">
            <FileDown className="w-4 h-4 mr-2" />
            {autoIssuing ? 'Issuing...' : 'Auto Issue All Documents'}
          </Button>
        </div>
      )}

      {/* ==================== ACCOUNTS RECEIVABLE (AR) ==================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><span className="text-sm font-bold text-primary">AR</span></div>
          <h4 className="text-base font-semibold">Accounts Receivable — Customer Invoice</h4>
        </div>

        {/* Warning: No payment terms */}
        {!hasInvoices && quotationPaymentTerms.length === 0 && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">No payment terms defined</p>
              <p className="text-amber-700">Go back to <strong>Step 4 (Quotation)</strong> and add payment terms to split invoices into installments. Without payment terms, a single invoice will be generated for the full amount.</p>
            </div>
          </div>
        )}

        {/* Invoice Generation Form */}
        {!hasInvoices && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm font-semibold">📝 Generate Invoice from Quotation</p>

            {/* Invoice metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Invoice # (auto)</Label>
                <Input disabled value={`INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">Invoice Date</Label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Input disabled value={quotation?.currency_input || 'USD'} />
              </div>
            </div>

            {/* Customer details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Customer</Label>
                <Input disabled value={customer.company || customerName} />
              </div>
              <div>
                <Label className="text-xs">Billing Address</Label>
                <Input value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder="Enter billing address" />
              </div>
            </div>

            {/* Invoice Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Invoice Line Items</p>
                <Button variant="outline" size="sm" onClick={addInvoiceLineItem}><Plus className="w-3 h-3 mr-1" />Add Line Item</Button>
              </div>
              <div className="erp-table-container">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground w-20">Qty</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground w-24">Unit</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-32">Unit Price</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-32">Subtotal</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>
                    {invoiceLineItems.map((li, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-3 py-1"><Input value={li.description} onChange={e => updateInvoiceLineItem(i, 'description', e.target.value)} className="h-8 text-sm" /></td>
                        <td className="px-3 py-1"><Input type="number" value={li.qty} onChange={e => updateInvoiceLineItem(i, 'qty', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center" /></td>
                        <td className="px-3 py-1"><Input value={li.unit} onChange={e => updateInvoiceLineItem(i, 'unit', e.target.value)} className="h-8 text-sm text-center" /></td>
                        <td className="px-3 py-1"><Input type="number" value={li.unitPrice || ''} onChange={e => updateInvoiceLineItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" /></td>
                        <td className="px-3 py-1 text-right font-mono text-sm">{formatUSD(li.qty * li.unitPrice)}</td>
                        <td className="px-3 py-1"><Button variant="ghost" size="sm" onClick={() => removeInvoiceLineItem(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Totals */}
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">Subtotal</p>
                <p className="text-right font-mono">{formatUSD(invoiceSubtotal)} | {formatIQD(invoiceSubtotal * fxRate)}</p>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">Tax Rate %</p>
                  <Input type="number" value={invoiceTaxRate || ''} onChange={e => setInvoiceTaxRate(parseFloat(e.target.value) || 0)} className="h-7 w-20 text-sm" />
                </div>
                <p className="text-right font-mono">{formatUSD(invoiceTaxAmount)} | {formatIQD(invoiceTaxAmount * fxRate)}</p>
                <p className="font-semibold">Total</p>
                <p className="text-right font-mono font-semibold text-primary">{formatUSD(invoiceTotal)} | {formatIQD(invoiceTotal * fxRate)}</p>
              </div>
            </div>

            {/* Payment Terms — shows how invoices will be split */}
            {quotationPaymentTerms.length > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-semibold mb-2">📋 Invoices will be split by Payment Terms</p>
                <p className="text-xs text-muted-foreground mb-2">One invoice per term — each with its own amount, due date, and payment tracking.</p>
                <div className="erp-table-container">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Invoice #</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">%</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount USD</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount IQD</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Due Date</th>
                    </tr></thead>
                    <tbody>
                      {quotationPaymentTerms.map((t: any, i: number) => {
                        const termUsd = Math.round(invoiceTotal * ((t.percentage || 0) / 100) * 100) / 100;
                        const termDueDays = (customer.payment_terms_days || 30) * (i + 1);
                        const termDueDate = new Date(new Date(invoiceDate).getTime() + termDueDays * 86400000).toISOString().split('T')[0];
                        return (
                          <tr key={t.id} className="border-b border-border">
                            <td className="px-3 py-2 font-mono text-xs text-primary">INV-{new Date().getFullYear()}-{String(invoices.length + i + 1).padStart(4, '0')}</td>
                            <td className="px-3 py-2">{t.description || `Installment ${i + 1}`}</td>
                            <td className="px-3 py-2 text-right font-mono">{t.percentage}%</td>
                            <td className="px-3 py-2 text-right font-mono">{formatUSD(termUsd)}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(termUsd * fxRate)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{termDueDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Invoice Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Payment Instructions</Label>
                <Textarea value={invoicePaymentInstructions} onChange={e => setInvoicePaymentInstructions(e.target.value)} rows={3} placeholder="Bank details, payment methods..." />
                {paymentMethods.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto: {paymentMethods.filter((pm: any) => pm.is_default).map((pm: any) => `${pm.bank_name || pm.method_type} ${pm.account_number ? `(****${pm.account_number.slice(-4)})` : ''}`).join(', ') || 'No default payment method set'}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Additional Notes</Label>
                <Textarea value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} rows={3} placeholder="Additional notes..." />
              </div>
            </div>

            {/* Generate Invoice Button */}
            <div className="flex gap-3">
              <Button onClick={handleGenerateInvoice} disabled={insertInvoice.isPending || invoiceLineItems.length === 0} size="lg">
                <FileDown className="w-4 h-4 mr-2" />
                {quotationPaymentTerms.length > 0 ? `Generate ${quotationPaymentTerms.length} Invoices (by Payment Terms)` : 'Generate Invoice'}
              </Button>
            </div>
          </div>
        )}

        {/* Existing Invoices */}
        {hasInvoices && (
          <div className="space-y-4">
            {invoices.map((inv: any) => {
              const dueUsd = (inv.amount_usd || 0) - (inv.paid_usd || 0);
              const daysOverdue = getDaysOverdue(inv.due_date);
              const status = getInvoiceStatus(inv);
              return (
                <div key={inv.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="p-4 flex justify-between items-start">
                    <div>
                      <p className="font-mono font-semibold text-base">{inv.invoice_no}</p>
                      <p className="text-xs text-muted-foreground">Issued: {inv.issued_date} • Due: {inv.due_date}</p>
                      <p className="text-xs text-muted-foreground">Customer: {customer.company || customerName}</p>
                      {billingAddress && <p className="text-xs text-muted-foreground">Address: {billingAddress}</p>}
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={status} />
                      <p className="text-lg font-bold text-primary">{formatUSD(inv.amount_usd)}</p>
                      <p className="text-xs text-muted-foreground">{formatIQD(inv.amount_iqd)}</p>
                      <p className="text-xs">Paid: <span className="text-emerald-600 font-medium">{formatUSD(inv.paid_usd || 0)}</span></p>
                      <p className="text-xs">Due: <span className="font-medium">{formatUSD(dueUsd)}</span></p>
                      {daysOverdue > 0 && <p className="text-xs text-destructive font-medium">{daysOverdue} days overdue</p>}
                    </div>
                  </div>


                  <div className="border-t border-border px-4 py-2 flex flex-wrap gap-2 bg-muted/30">
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoicePdf(inv)}>
                      <Eye className="w-3.5 h-3.5 mr-1" />Preview
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoicePdf(inv)}>
                      <FileDown className="w-3.5 h-3.5 mr-1" />Download PDF
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toast.info('Email sending coming soon')}>
                      <Send className="w-3.5 h-3.5 mr-1" />Send to Customer
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => window.print()}>
                      <Printer className="w-3.5 h-3.5 mr-1" />Print
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== ACCOUNTS PAYABLE (AP) ==================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><span className="text-sm font-bold text-amber-700">AP</span></div>
          <h4 className="text-base font-semibold">Accounts Payable — Vendor Bills</h4>
        </div>

        {/* Bill Generation - Auto from costs (only if no bills yet and vendor costs exist) */}
        {!hasBills && vendorCosts.length > 0 && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm font-semibold">📝 Auto-Generate Vendor Bills from Order Costs</p>
            <p className="text-xs text-muted-foreground">Bills are generated per vendor from the cost sheet. Broker commissions and employee incentives are NOT included.</p>
            <div className="erp-table-container">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vendor</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount USD</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount IQD</th>
                </tr></thead>
                <tbody>
                  {vendorCosts.map((c: any) => (
                    <tr key={c.id} className="border-b border-border">
                      <td className="px-3 py-2">{vendors.find((v: any) => v.id === c.vendor_id)?.company || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.description || c.category}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatUSD(c.amount_usd)}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(c.amount_iqd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Bill Date</Label><Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} /></div>
              <div><Label className="text-xs">Tax Rate %</Label><Input type="number" value={billTaxRate || ''} onChange={e => setBillTaxRate(parseFloat(e.target.value) || 0)} /></div>
              <div><Label className="text-xs">Notes</Label><Input value={billNotes} onChange={e => setBillNotes(e.target.value)} placeholder="Vendor ref #..." /></div>
            </div>
            <Button onClick={handleGenerateBills} disabled={insertBill.isPending} size="lg">
              <FileDown className="w-4 h-4 mr-2" />Generate Vendor Bills from Costs
            </Button>
          </div>
        )}

        {/* Existing Vendor Bills */}
        {hasBills && (
          <div className="erp-table-container">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bill #</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Vendor</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Due Date</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Paid</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Due</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground">Days Overdue</th>
                <th className="w-20"></th>
              </tr></thead>
              <tbody>
                {vendorBills.map((bill: any) => {
                  const vendorName = vendors.find((v: any) => v.id === bill.vendor_id)?.company || 'Unknown';
                  const dueUsd = (bill.amount_usd || 0) - (bill.paid_usd || 0);
                  const billStatus = (bill.paid_usd || 0) >= bill.amount_usd ? 'paid' : (bill.paid_usd || 0) > 0 ? 'partial' : bill.due_date && new Date(bill.due_date) < new Date() ? 'overdue' : bill.status;
                  const daysOverdue = getDaysOverdue(bill.due_date);
                  return (
                    <tr key={bill.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-mono font-medium text-primary">{bill.bill_no}</td>
                      <td className="px-4 py-2">{vendorName}</td>
                      <td className="px-4 py-2 text-muted-foreground">{bill.issued_date || '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{bill.due_date || '—'}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatUSD(bill.amount_usd)}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-600">{formatUSD(bill.paid_usd || 0)}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatUSD(dueUsd)}</td>
                      <td className="px-4 py-2 text-center"><StatusBadge status={billStatus} /></td>
                      <td className="px-4 py-2 text-center">{daysOverdue > 0 ? <span className="text-destructive font-medium">{daysOverdue}</span> : '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadBillPdf(bill)}><FileDown className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Vendor Bill Button - always available */}
        <div>
          <Button variant="outline" onClick={() => setShowAddBillForm(!showAddBillForm)}>
            <Plus className="w-4 h-4 mr-2" />{showAddBillForm ? 'Cancel' : 'Add Vendor Bill'}
          </Button>
        </div>

        {/* Manual Add Vendor Bill Form */}
        {showAddBillForm && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm font-semibold">📝 New Vendor Bill</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Bill # (auto)</Label>
                <Input disabled value={`BILL-${new Date().getFullYear()}-${String(vendorBills.length + 1).padStart(4, '0')}`} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">Vendor</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={manualBillVendorId} onChange={e => {
                  const vid = e.target.value;
                  setManualBillVendorId(vid);
                  const v = vendors.find((v: any) => v.id === vid);
                  if (v?.payment_terms_days) setManualBillDueDate(new Date(Date.now() + v.payment_terms_days * 86400000).toISOString().split('T')[0]);
                  // Auto-populate line items from vendor costs
                  const vCosts = vendorCosts.filter((c: any) => c.vendor_id === vid);
                  if (vCosts.length > 0) {
                    setManualBillLineItems(vCosts.map((c: any) => ({
                      description: c.description || c.category || 'Service',
                      qty: 1,
                      unit: 'Service',
                      unitCost: c.amount_usd || 0,
                    })));
                  } else {
                    setManualBillLineItems([{ description: '', qty: 1, unit: 'Service', unitCost: 0 }]);
                  }
                }}>
                  <option value="">Select vendor...</option>
                  {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.company}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Bill Date</Label>
                <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={manualBillDueDate} onChange={e => setManualBillDueDate(e.target.value)} />
              </div>
            </div>

            {/* Bill Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Line Items</p>
                <Button variant="outline" size="sm" onClick={addManualBillLineItem}><Plus className="w-3 h-3 mr-1" />Add Line Item</Button>
              </div>
              <div className="erp-table-container">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground w-20">Qty</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground w-24">Unit</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-32">Unit Cost</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-32">Subtotal</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>
                    {manualBillLineItems.map((li, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-3 py-1"><Input value={li.description} onChange={e => updateManualBillLineItem(i, 'description', e.target.value)} className="h-8 text-sm" /></td>
                        <td className="px-3 py-1"><Input type="number" value={li.qty} onChange={e => updateManualBillLineItem(i, 'qty', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center" /></td>
                        <td className="px-3 py-1"><Input value={li.unit} onChange={e => updateManualBillLineItem(i, 'unit', e.target.value)} className="h-8 text-sm text-center" /></td>
                        <td className="px-3 py-1"><Input type="number" value={li.unitCost || ''} onChange={e => updateManualBillLineItem(i, 'unitCost', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right" /></td>
                        <td className="px-3 py-1 text-right font-mono text-sm">{formatUSD(li.qty * li.unitCost)}</td>
                        <td className="px-3 py-1"><Button variant="ghost" size="sm" onClick={() => removeManualBillLineItem(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill Totals */}
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">Subtotal</p>
                <p className="text-right font-mono">{formatUSD(manualBillSubtotal)} | {formatIQD(manualBillSubtotal * fxRate)}</p>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">Tax Rate %</p>
                  <Input type="number" value={billTaxRate || ''} onChange={e => setBillTaxRate(parseFloat(e.target.value) || 0)} className="h-7 w-20 text-sm" />
                </div>
                <p className="text-right font-mono">{formatUSD(manualBillTaxAmount)} | {formatIQD(manualBillTaxAmount * fxRate)}</p>
                <p className="font-semibold">Total</p>
                <p className="text-right font-mono font-semibold">{formatUSD(manualBillTotal)} | {formatIQD(manualBillTotal * fxRate)}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Vendor Invoice Ref / Notes</Label>
              <Input value={billNotes} onChange={e => setBillNotes(e.target.value)} placeholder="Vendor invoice reference #..." />
            </div>

            <Button onClick={handleAddManualBill} disabled={insertBill.isPending || !manualBillVendorId} size="lg">
              <FileDown className="w-4 h-4 mr-2" />Create Vendor Bill
            </Button>
          </div>
        )}
      </div>

      {/* ==================== COMMISSION & INCENTIVE TRACKING ==================== */}
      {(partnerCommCosts.length > 0 || employeeIncentiveCosts.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center"><span className="text-sm">🤝</span></div>
            <h4 className="text-base font-semibold">Broker Commissions & Employee Incentives</h4>
          </div>
          <p className="text-xs text-muted-foreground">These are tracked separately in Finance (Employee Commissions Management) and are NOT included in vendor bills.</p>
          <div className="erp-table-container">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount USD</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount IQD</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Payment Condition</th>
              </tr></thead>
              <tbody>
                {partnerCommCosts.map((c: any) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-3 py-2">🤝 Broker Commission</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.description}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatUSD(c.amount_usd)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(c.amount_iqd)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">Pay after customer pays</td>
                  </tr>
                ))}
                {employeeIncentiveCosts.map((c: any) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-3 py-2">💰 Employee Incentive</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.description}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatUSD(c.amount_usd)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(c.amount_iqd)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">On order completion</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-medium">
                  <td colSpan={2} className="px-3 py-2 text-right">Total</td>
                  <td className="px-3 py-2 text-right font-mono">{formatUSD(totalCommUsd)}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatIQD(totalCommIqd)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUMMARY SECTION ==================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <h4 className="text-base font-semibold">📊 Summary</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* AR Summary */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-semibold mb-3">AR Summary</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Invoices issued</span><span className="font-medium">{invoices.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total AR</span><span className="font-mono font-medium">{formatUSD(totalArUsd)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount paid</span><span className="font-mono text-emerald-600">{formatUSD(totalArPaidUsd)}</span></div>
              <div className="flex justify-between border-t border-border pt-1"><span className="font-medium">Due</span><span className="font-mono font-semibold">{formatUSD(totalArDueUsd)}</span></div>
            </div>
          </div>
          {/* AP Summary */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-semibold mb-3">AP Summary</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Bills issued</span><span className="font-medium">{vendorBills.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total AP</span><span className="font-mono font-medium">{formatUSD(totalApUsd)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount paid</span><span className="font-mono text-emerald-600">{formatUSD(totalApPaidUsd)}</span></div>
              <div className="flex justify-between border-t border-border pt-1"><span className="font-medium">Due</span><span className="font-mono font-semibold">{formatUSD(totalApDueUsd)}</span></div>
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-primary/5 rounded-lg border border-border">
          <p className="text-sm font-semibold mb-2">Gross Profit</p>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Total AR</span><span className="font-mono">{formatUSD(totalArUsd)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− Total AP</span><span className="font-mono">{formatUSD(totalApUsd)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− Broker Commissions</span><span className="font-mono">{formatUSD(partnerCommCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− Employee Incentives</span><span className="font-mono">{formatUSD(employeeIncentiveCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0))}</span></div>
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="font-semibold">= Gross Profit</span>
              <span className={cn('font-mono font-bold text-lg', grossProfitUsd >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                {formatUSD(grossProfitUsd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margin %</span>
              <span className="font-mono font-medium">{Math.round(marginPct * 100) / 100}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mark Step Complete */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground mb-2">
          {hasInvoices && hasBills ? '✅ At least one invoice and one bill generated. You can complete this step.' : '⚠ Generate at least one invoice (AR) and one vendor bill (AP) to complete this step.'}
        </p>
      </div>
    </div>
  );
}

function Step8({ invoices, vendorBills, orderId, vendors, customers }: any) {
  const insertPayment = useInsertMutation('payments');
  const updateInvoice = useUpdateMutation('invoices');
  const updateBill = useUpdateMutation('vendor_bills');
  const { data: payments = [] } = useTableQuery<any>('payments', { filter: { order_id: orderId } });

  const arPayments = payments.filter((p: any) => p.direction === 'AR');
  const apPayments = payments.filter((p: any) => p.direction === 'AP');




  // AR payment form
  const [arForm, setArForm] = useState({
    ref_id: '',
    amount_usd: 0,
    currency_input: 'USD',
    method: 'Bank Transfer',
    reference: '',
    pay_fx_rate: DEFAULT_FX_RATE,
    date: new Date().toISOString().split('T')[0],
    payment_fee_usd: 0,
    fee_description: '',
  });

  // AP payment form
  const [apForm, setApForm] = useState({
    ref_id: '',
    amount_usd: 0,
    currency_input: 'USD',
    method: 'Bank Transfer',
    reference: '',
    pay_fx_rate: DEFAULT_FX_RATE,
    date: new Date().toISOString().split('T')[0],
    payment_fee_usd: 0,
    fee_description: '',
  });

  const setAr = (k: string, v: any) => setArForm(p => ({ ...p, [k]: v }));
  const setAp = (k: string, v: any) => setApForm(p => ({ ...p, [k]: v }));

  const selectedInvoice = invoices.find((i: any) => i.id === arForm.ref_id);
  const selectedBill = vendorBills.find((b: any) => b.id === apForm.ref_id);

  // AR FX calc
  const arDocFxRate = selectedInvoice?.fx_rate || DEFAULT_FX_RATE;
  const arDual = calculateDualAmount(arForm.amount_usd, arForm.currency_input as any, arForm.pay_fx_rate, arForm.date);
  const arFxDiffIqd = arForm.amount_usd * arForm.pay_fx_rate - arForm.amount_usd * arDocFxRate;
  const arFxGainLossUsd = arForm.pay_fx_rate > 0 ? Math.round((arFxDiffIqd / arForm.pay_fx_rate) * 100) / 100 : 0;

  // AP FX calc
  const apDocFxRate = selectedBill?.fx_rate || DEFAULT_FX_RATE;
  const apDual = calculateDualAmount(apForm.amount_usd, apForm.currency_input as any, apForm.pay_fx_rate, apForm.date);
  const apFxDiffIqd = apForm.amount_usd * apForm.pay_fx_rate - apForm.amount_usd * apDocFxRate;
  const apFxGainLossUsd = apForm.pay_fx_rate > 0 ? Math.round((apFxDiffIqd / apForm.pay_fx_rate) * 100) / 100 : 0;

  const handleRecordARPayment = async () => {
    if (!arForm.ref_id || arForm.amount_usd <= 0) { toast.error('Select invoice and enter amount'); return; }
    const payNo = `PAY-${new Date().getFullYear()}-${String(payments.length + 1).padStart(4, '0')}`;
    const feeUsd = arForm.payment_fee_usd || 0;
    const feeIqd = Math.round(feeUsd * arForm.pay_fx_rate);
    await insertPayment.mutateAsync({
      pay_no: payNo, order_id: orderId, direction: 'AR', ref_type: 'invoice',
      ref_id: arForm.ref_id, counterparty_id: selectedInvoice?.customer_id || null,
      amount_usd: arDual.amount_usd, amount_iqd: arDual.amount_iqd,
      fx_rate: arForm.pay_fx_rate, fx_date: arForm.date, currency_input: arForm.currency_input,
      pay_currency: arForm.currency_input, is_fx_locked: true, date: arForm.date,
      method: arForm.method, reference: arForm.reference,
      fx_gain_loss_usd: arFxGainLossUsd, fx_gain_loss_iqd: Math.round(arFxDiffIqd),
      payment_fee_usd: feeUsd, payment_fee_iqd: feeIqd, fee_description: arForm.fee_description || null,
    } as any);
    if (selectedInvoice) {
      const newPaid = (selectedInvoice.paid_usd || 0) + arDual.amount_usd;
      await updateInvoice.mutateAsync({
        id: selectedInvoice.id,
        paid_usd: newPaid, paid_iqd: (selectedInvoice.paid_iqd || 0) + arDual.amount_iqd,
        status: newPaid >= selectedInvoice.amount_usd ? 'paid' : 'partial',
      });
    }
    setArForm(p => ({ ...p, ref_id: '', amount_usd: 0, reference: '', payment_fee_usd: 0, fee_description: '' }));
    toast.success('AR payment recorded');
  };

  const handleRecordAPPayment = async () => {
    if (!apForm.ref_id || apForm.amount_usd <= 0) { toast.error('Select bill and enter amount'); return; }
    const payNo = `PAY-${new Date().getFullYear()}-${String(payments.length + 1).padStart(4, '0')}`;
    const feeUsd = apForm.payment_fee_usd || 0;
    const feeIqd = Math.round(feeUsd * apForm.pay_fx_rate);
    await insertPayment.mutateAsync({
      pay_no: payNo, order_id: orderId, direction: 'AP', ref_type: 'bill',
      ref_id: apForm.ref_id, counterparty_id: selectedBill?.vendor_id || null,
      amount_usd: apDual.amount_usd, amount_iqd: apDual.amount_iqd,
      fx_rate: apForm.pay_fx_rate, fx_date: apForm.date, currency_input: apForm.currency_input,
      pay_currency: apForm.currency_input, is_fx_locked: true, date: apForm.date,
      method: apForm.method, reference: apForm.reference,
      fx_gain_loss_usd: apFxGainLossUsd, fx_gain_loss_iqd: Math.round(apFxDiffIqd),
      payment_fee_usd: feeUsd, payment_fee_iqd: feeIqd, fee_description: apForm.fee_description || null,
    } as any);
    if (selectedBill) {
      const newPaid = (selectedBill.paid_usd || 0) + apDual.amount_usd;
      await updateBill.mutateAsync({
        id: selectedBill.id,
        paid_usd: newPaid, paid_iqd: (selectedBill.paid_iqd || 0) + apDual.amount_iqd,
        status: newPaid >= selectedBill.amount_usd ? 'paid' : 'partial',
      });
    }
    setApForm(p => ({ ...p, ref_id: '', amount_usd: 0, reference: '', payment_fee_usd: 0, fee_description: '' }));
    toast.success('AP payment recorded');
  };




  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Step 8 — Payment Processing</h3>

      {/* ==================== AR SECTION ==================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><span className="text-sm font-bold text-primary">AR</span></div>
          <h4 className="text-base font-semibold">Accounts Receivable — Customer Payments</h4>
        </div>

        {/* Invoice cards */}
        {invoices.map((inv: any) => {
          const customer = customers?.find((c: any) => c.id === inv.customer_id);
          const dueUsd = (inv.amount_usd || 0) - (inv.paid_usd || 0);
          const invPayments = arPayments.filter((p: any) => p.ref_id === inv.id);

          return (
            <div key={inv.id} className="border border-border rounded-lg overflow-hidden">
              <div className="p-4 flex justify-between items-start">
                <div>
                  <p className="font-mono font-semibold">{inv.invoice_no}</p>
                  <p className="text-xs text-muted-foreground">Customer: {customer?.company || '—'}</p>
                  <p className="text-xs text-muted-foreground">Issued: {inv.issued_date} • Due: {inv.due_date}</p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={dueUsd <= 0 ? 'paid' : (inv.paid_usd || 0) > 0 ? 'partial' : 'issued'} />
                  <p className="text-lg font-bold text-primary">{formatUSD(inv.amount_usd)}</p>
                  <p className="text-xs">Paid: <span className="text-emerald-600 font-medium">{formatUSD(inv.paid_usd || 0)}</span> | Due: <span className="font-medium">{formatUSD(dueUsd)}</span></p>
                </div>
              </div>


              {/* AR Payments for this invoice */}
              {invPayments.length > 0 && (
                <div className="border-t border-border px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Payment History</p>
                   <table className="w-full text-xs">
                     <thead><tr className="border-b border-border">
                       <th className="text-left py-1 font-medium text-muted-foreground">Pay #</th>
                       <th className="text-left py-1 font-medium text-muted-foreground">Date</th>
                       <th className="text-right py-1 font-medium text-muted-foreground">Amount</th>
                       <th className="text-left py-1 font-medium text-muted-foreground">Method</th>
                       <th className="text-right py-1 font-medium text-muted-foreground">Fee</th>
                       <th className="text-right py-1 font-medium text-muted-foreground">FX Rate</th>
                       <th className="text-right py-1 font-medium text-muted-foreground">FX G/L</th>
                     </tr></thead>
                     <tbody>
                       {invPayments.map((p: any) => (
                         <tr key={p.id} className="border-b border-border">
                           <td className="py-1 font-mono">{p.pay_no}</td>
                           <td className="py-1 text-muted-foreground">{p.date}</td>
                           <td className="py-1 text-right"><CurrencyDisplay usd={p.amount_usd} iqd={p.amount_iqd} size="sm" /></td>
                           <td className="py-1 capitalize">{p.method?.replace('_', ' ')}</td>
                           <td className="py-1 text-right">{(p.payment_fee_usd || 0) > 0 ? <span className="text-amber-600">{formatUSD(p.payment_fee_usd)}</span> : '—'}</td>
                           <td className="py-1 text-right font-mono">{p.fx_rate}</td>
                           <td className="py-1 text-right"><span className={(p.fx_gain_loss_usd || 0) >= 0 ? 'fx-gain' : 'fx-loss'}>{(p.fx_gain_loss_usd || 0) !== 0 ? `${(p.fx_gain_loss_usd || 0) > 0 ? '+' : ''}${formatUSD(p.fx_gain_loss_usd)}` : '—'}</span></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              )}
            </div>
          );
        })}

        {/* AR Record Payment Form */}
        {invoices.some((i: any) => (i.amount_usd || 0) > (i.paid_usd || 0)) && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
            <p className="text-sm font-semibold">💰 Record AR Payment (Customer → You)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Invoice</Label>
                <Select value={arForm.ref_id} onValueChange={v => {
                  setAr('ref_id', v);
                  const inv = invoices.find((i: any) => i.id === v);
                  if (inv) setAr('pay_fx_rate', inv.fx_rate || DEFAULT_FX_RATE);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select invoice..." /></SelectTrigger>
                  <SelectContent>
                    {invoices.filter((i: any) => (i.amount_usd || 0) > (i.paid_usd || 0)).map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>{i.invoice_no} ({formatUSD(i.amount_usd - (i.paid_usd || 0))} due)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Amount USD</Label>
                <Input type="number" value={arForm.amount_usd || ''} onChange={e => setAr('amount_usd', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Payment FX Rate</Label>
                <Input type="number" value={arForm.pay_fx_rate} onChange={e => setAr('pay_fx_rate', parseFloat(e.target.value) || DEFAULT_FX_RATE)} />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={arForm.date} onChange={e => setAr('date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Method</Label>
                <Select value={arForm.method} onValueChange={v => setAr('method', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Hawala">Hawala (Exchange Office)</SelectItem>
                    <SelectItem value="Wire Transfer">Wire Transfer</SelectItem>
                    <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Reference #</Label>
                <Input value={arForm.reference} onChange={e => setAr('reference', e.target.value)} placeholder="Transaction ref..." />
              </div>
              <div>
                <Label className="text-xs">Payment Fee (USD)</Label>
                <Input type="number" value={arForm.payment_fee_usd || ''} onChange={e => setAr('payment_fee_usd', parseFloat(e.target.value) || 0)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Fee Description</Label>
                <Input value={arForm.fee_description} onChange={e => setAr('fee_description', e.target.value)} placeholder="e.g. Hawala fee, wire fee..." />
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-muted-foreground">IQD: {formatIQD(arDual.amount_iqd)}</span>
              {arForm.payment_fee_usd > 0 && <span className="text-sm text-amber-600">Fee: {formatUSD(arForm.payment_fee_usd)}</span>}
              {selectedInvoice && arForm.amount_usd > 0 && (
                <span className={`text-sm font-medium ${arFxGainLossUsd >= 0 ? 'fx-gain' : 'fx-loss'}`}>
                  FX {arFxGainLossUsd >= 0 ? 'Gain' : 'Loss'}: {formatUSD(Math.abs(arFxGainLossUsd))}
                </span>
              )}
            </div>
            <Button onClick={handleRecordARPayment} disabled={insertPayment.isPending}>
              <Plus className="w-4 h-4 mr-2" />Record AR Payment
            </Button>
          </div>
        )}

        {/* AR Summary */}
        <div className="p-3 bg-muted/30 rounded-lg text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total Invoiced</span><span className="font-mono font-medium">{formatUSD(invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Received</span><span className="font-mono text-emerald-600">{formatUSD(invoices.reduce((s: number, i: any) => s + (i.paid_usd || 0), 0))}</span></div>
          <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-medium">Outstanding AR</span><span className="font-mono font-semibold">{formatUSD(invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0) - (i.paid_usd || 0), 0))}</span></div>
        </div>
      </div>

      {/* ==================== AP SECTION ==================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><span className="text-sm font-bold text-amber-700">AP</span></div>
          <h4 className="text-base font-semibold">Accounts Payable — Vendor Payments</h4>
        </div>

        {/* Vendor Bill cards */}
        {vendorBills.map((bill: any) => {
          const vendor = vendors?.find((v: any) => v.id === bill.vendor_id);
          const dueUsd = (bill.amount_usd || 0) - (bill.paid_usd || 0);
          const billPayments = apPayments.filter((p: any) => p.ref_id === bill.id);
          const daysOverdue = bill.due_date && new Date(bill.due_date) < new Date() ? Math.ceil((new Date().getTime() - new Date(bill.due_date).getTime()) / 86400000) : 0;

          return (
            <div key={bill.id} className="border border-border rounded-lg overflow-hidden">
              <div className="p-4 flex justify-between items-start">
                <div>
                  <p className="font-mono font-semibold">{bill.bill_no}</p>
                  <p className="text-xs text-muted-foreground">Vendor: {vendor?.company || '—'}</p>
                  <p className="text-xs text-muted-foreground">Issued: {bill.issued_date || '—'} • Due: {bill.due_date || '—'}</p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={dueUsd <= 0 ? 'paid' : (bill.paid_usd || 0) > 0 ? 'partial' : daysOverdue > 0 ? 'overdue' : 'issued'} />
                  <p className="text-lg font-bold">{formatUSD(bill.amount_usd)}</p>
                  <p className="text-xs">Paid: <span className="text-emerald-600 font-medium">{formatUSD(bill.paid_usd || 0)}</span> | Due: <span className="font-medium">{formatUSD(dueUsd)}</span></p>
                  {daysOverdue > 0 && <p className="text-xs text-destructive font-medium">{daysOverdue} days overdue</p>}
                </div>
              </div>

              {/* AP Payments for this bill */}
              {billPayments.length > 0 && (
                <div className="border-t border-border px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Payment History</p>
                  <table className="w-full text-xs">
                     <thead><tr className="border-b border-border">
                       <th className="text-left py-1 font-medium text-muted-foreground">Pay #</th>
                       <th className="text-left py-1 font-medium text-muted-foreground">Date</th>
                       <th className="text-right py-1 font-medium text-muted-foreground">Amount</th>
                       <th className="text-left py-1 font-medium text-muted-foreground">Method</th>
                       <th className="text-right py-1 font-medium text-muted-foreground">Fee</th>
                       <th className="text-right py-1 font-medium text-muted-foreground">FX Rate</th>
                       <th className="text-right py-1 font-medium text-muted-foreground">FX G/L</th>
                     </tr></thead>
                     <tbody>
                       {billPayments.map((p: any) => (
                         <tr key={p.id} className="border-b border-border">
                           <td className="py-1 font-mono">{p.pay_no}</td>
                           <td className="py-1 text-muted-foreground">{p.date}</td>
                           <td className="py-1 text-right"><CurrencyDisplay usd={p.amount_usd} iqd={p.amount_iqd} size="sm" /></td>
                           <td className="py-1 capitalize">{p.method?.replace('_', ' ')}</td>
                           <td className="py-1 text-right">{(p.payment_fee_usd || 0) > 0 ? <span className="text-amber-600">{formatUSD(p.payment_fee_usd)}</span> : '—'}</td>
                           <td className="py-1 text-right font-mono">{p.fx_rate}</td>
                           <td className="py-1 text-right"><span className={(p.fx_gain_loss_usd || 0) >= 0 ? 'fx-gain' : 'fx-loss'}>{(p.fx_gain_loss_usd || 0) !== 0 ? `${(p.fx_gain_loss_usd || 0) > 0 ? '+' : ''}${formatUSD(p.fx_gain_loss_usd)}` : '—'}</span></td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* AP Record Payment Form */}
        {vendorBills.some((b: any) => (b.amount_usd || 0) > (b.paid_usd || 0)) && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
            <p className="text-sm font-semibold">💸 Record AP Payment (You → Vendor)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Vendor Bill</Label>
                <Select value={apForm.ref_id} onValueChange={v => {
                  setAp('ref_id', v);
                  const bill = vendorBills.find((b: any) => b.id === v);
                  if (bill) setAp('pay_fx_rate', bill.fx_rate || DEFAULT_FX_RATE);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select bill..." /></SelectTrigger>
                  <SelectContent>
                    {vendorBills.filter((b: any) => (b.amount_usd || 0) > (b.paid_usd || 0)).map((b: any) => {
                      const vName = vendors?.find((v: any) => v.id === b.vendor_id)?.company || '';
                      return <SelectItem key={b.id} value={b.id}>{b.bill_no} — {vName} ({formatUSD(b.amount_usd - (b.paid_usd || 0))} due)</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Amount USD</Label>
                <Input type="number" value={apForm.amount_usd || ''} onChange={e => setAp('amount_usd', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Payment FX Rate</Label>
                <Input type="number" value={apForm.pay_fx_rate} onChange={e => setAp('pay_fx_rate', parseFloat(e.target.value) || DEFAULT_FX_RATE)} />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={apForm.date} onChange={e => setAp('date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Method</Label>
                <Select value={apForm.method} onValueChange={v => setAp('method', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Hawala">Hawala (Exchange Office)</SelectItem>
                    <SelectItem value="Wire Transfer">Wire Transfer</SelectItem>
                    <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Reference #</Label>
                <Input value={apForm.reference} onChange={e => setAp('reference', e.target.value)} placeholder="Transaction ref..." />
              </div>
              <div>
                <Label className="text-xs">Payment Fee (USD)</Label>
                <Input type="number" value={apForm.payment_fee_usd || ''} onChange={e => setAp('payment_fee_usd', parseFloat(e.target.value) || 0)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Fee Description</Label>
                <Input value={apForm.fee_description} onChange={e => setAp('fee_description', e.target.value)} placeholder="e.g. Hawala fee, wire fee..." />
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-muted-foreground">IQD: {formatIQD(apDual.amount_iqd)}</span>
              {apForm.payment_fee_usd > 0 && <span className="text-sm text-amber-600">Fee: {formatUSD(apForm.payment_fee_usd)}</span>}
              {selectedBill && apForm.amount_usd > 0 && (
                <span className={`text-sm font-medium ${apFxGainLossUsd >= 0 ? 'fx-gain' : 'fx-loss'}`}>
                  FX {apFxGainLossUsd >= 0 ? 'Gain' : 'Loss'}: {formatUSD(Math.abs(apFxGainLossUsd))}
                </span>
              )}
            </div>
            <Button onClick={handleRecordAPPayment} disabled={insertPayment.isPending}>
              <Plus className="w-4 h-4 mr-2" />Record AP Payment
            </Button>
          </div>
        )}

        {/* AP Summary */}
        <div className="p-3 bg-muted/30 rounded-lg text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total Billed</span><span className="font-mono font-medium">{formatUSD(vendorBills.reduce((s: number, b: any) => s + (b.amount_usd || 0), 0))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Paid</span><span className="font-mono text-emerald-600">{formatUSD(vendorBills.reduce((s: number, b: any) => s + (b.paid_usd || 0), 0))}</span></div>
         <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-medium">Outstanding AP</span><span className="font-mono font-semibold">{formatUSD(vendorBills.reduce((s: number, b: any) => s + (b.amount_usd || 0) - (b.paid_usd || 0), 0))}</span></div>
        </div>
      </div>

      {/* ==================== FX RECONCILIATION SUMMARY ==================== */}
      {payments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center"><span className="text-sm">💱</span></div>
            <h4 className="text-base font-semibold">FX Reconciliation Summary</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">AR FX Gain/Loss</p>
              {(() => {
                const arFxTotal = arPayments.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);
                return <p className={cn('font-mono font-semibold', arFxTotal > 0 ? 'text-emerald-600' : arFxTotal < 0 ? 'text-destructive' : 'text-muted-foreground')}>{arFxTotal > 0 ? '+' : ''}{formatUSD(arFxTotal)}</p>;
              })()}
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">AP FX Gain/Loss</p>
              {(() => {
                const apFxTotal = apPayments.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);
                return <p className={cn('font-mono font-semibold', apFxTotal > 0 ? 'text-emerald-600' : apFxTotal < 0 ? 'text-destructive' : 'text-muted-foreground')}>{apFxTotal > 0 ? '+' : ''}{formatUSD(apFxTotal)}</p>;
              })()}
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Net FX Impact</p>
              {(() => {
                const netFx = payments.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);
                return <p className={cn('font-mono font-bold text-lg', netFx > 0 ? 'text-emerald-600' : netFx < 0 ? 'text-destructive' : 'text-muted-foreground')}>{netFx > 0 ? '+' : ''}{formatUSD(netFx)}</p>;
              })()}
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Fees Paid</p>
              <p className="font-mono font-semibold text-amber-600">{formatUSD(payments.reduce((s: number, p: any) => s + (p.payment_fee_usd || 0), 0))}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step9({ order, costs, invoices, vendorBills, payments, employees, partners, onSave }: any) {
  const { isAdmin } = useAuth();
  const insertCommission = useInsertMutation('commissions');
  const { data: commissions = [] } = useTableQuery<any>('commissions', { filter: { order_id: order.id } });

  const isLocked = order.status_step >= 9 && order.closed_at;

  // Revenue = sum of invoices
  const revenueUsd = invoices.reduce((s: number, i: any) => s + (i.amount_usd || 0), 0);
  const revenueIqd = invoices.reduce((s: number, i: any) => s + (i.amount_iqd || 0), 0);

  // Costs = vendor costs (excluding partner_commission and employee_incentive categories)
  const vendorCosts = costs.filter((c: any) => c.category !== 'partner_commission' && c.category !== 'employee_incentive');
  const costsUsd = vendorCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const costsIqd = vendorCosts.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);

  // Partner commissions and employee incentives from cost sheet
  const partnerCommCosts = costs.filter((c: any) => c.category === 'partner_commission');
  const employeeIncentiveCosts = costs.filter((c: any) => c.category === 'employee_incentive');
  const commissionsUsd = partnerCommCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0) + employeeIncentiveCosts.reduce((s: number, c: any) => s + (c.amount_usd || 0), 0);
  const commissionsIqd = partnerCommCosts.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0) + employeeIncentiveCosts.reduce((s: number, c: any) => s + (c.amount_iqd || 0), 0);

  // Payment fees
  const totalFeesUsd = payments.reduce((s: number, p: any) => s + (p.payment_fee_usd || 0), 0);

  // FX gain/loss from all payments
  const fxGainLossUsd = payments.reduce((s: number, p: any) => s + (p.fx_gain_loss_usd || 0), 0);

  // Net Profit
  const profitUsd = revenueUsd - costsUsd - commissionsUsd - totalFeesUsd + fxGainLossUsd;
  const profitIqd = revenueIqd - costsIqd - commissionsIqd;
  const marginPct = revenueUsd > 0 ? (profitUsd / revenueUsd) * 100 : 0;

  const handleGenerateCommissions = async () => {
    if (commissions.length > 0) {
      toast.error('Commissions already generated for this order');
      return;
    }
    const fxRate = DEFAULT_FX_RATE;
    const fxDate = new Date().toISOString().split('T')[0];
    let generated = 0;

    // Employee commissions based on responsible employee
    const employee = employees.find((e: any) => e.id === order.responsible_employee_id);
    if (employee && (employee.commission_rate_pct || 0) > 0) {
      const commAmount = profitUsd * (employee.commission_rate_pct / 100);
      const dual = calculateDualAmount(commAmount, 'USD', fxRate, fxDate);
      await insertCommission.mutateAsync({
        order_id: order.id, type: 'employee', person_id: employee.id,
        rate: employee.commission_rate_pct, rule: 'on_close',
        amount_usd: dual.amount_usd, amount_iqd: dual.amount_iqd,
        fx_rate: fxRate, fx_date: fxDate, currency_input: 'USD',
        status: 'accrued',
      });
      generated++;
    }

    // Partner/broker commissions
    for (const pc of partnerCommCosts) {
      const dual = calculateDualAmount(pc.amount_usd, 'USD', fxRate, fxDate);
      await insertCommission.mutateAsync({
        order_id: order.id, type: 'partner', person_id: pc.vendor_id || null,
        rate: null, rule: 'on_close',
        amount_usd: dual.amount_usd, amount_iqd: dual.amount_iqd,
        fx_rate: fxRate, fx_date: fxDate, currency_input: 'USD',
        status: 'accrued',
      });
      generated++;
    }

    if (generated === 0) toast.info('No commission rules found');
    else toast.success(`${generated} commission(s) generated`);
  };

  const handleCloseOrder = async () => {
    if (commissions.length === 0) {
      toast.error('Generate commissions before closing the order');
      return;
    }
    await onSave({ status_step: 9, closed_at: new Date().toISOString() });
    toast.success('Order closed and locked');
  };

  const handleUnlockOrder = async () => {
    await onSave({ closed_at: null });
    toast.success('Order unlocked — you can now edit all steps');
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        Step 9 — Order Closure
        {isLocked && <Lock className="w-4 h-4 text-amber-500" />}
      </h3>

      {/* P&L Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <h4 className="text-base font-semibold">📊 Final Profit & Loss</h4>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Revenue (Invoices)</span><span className="font-mono font-medium">{formatUSD(revenueUsd)} | {formatIQD(revenueIqd)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">− Vendor Costs</span><span className="font-mono">{formatUSD(costsUsd)} | {formatIQD(costsIqd)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">− Commissions & Incentives</span><span className="font-mono">{formatUSD(commissionsUsd)} | {formatIQD(commissionsIqd)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">− Payment Fees</span><span className="font-mono">{formatUSD(totalFeesUsd)}</span></div>
          <div className="flex justify-between"><span className={cn('text-muted-foreground', fxGainLossUsd >= 0 ? 'text-emerald-600' : 'text-destructive')}>+ FX Gain/Loss</span><span className={cn('font-mono', fxGainLossUsd >= 0 ? 'text-emerald-600' : 'text-destructive')}>{fxGainLossUsd >= 0 ? '+' : ''}{formatUSD(fxGainLossUsd)}</span></div>
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="font-semibold text-base">Net Profit</span>
            <span className={cn('font-mono font-bold text-xl', profitUsd >= 0 ? 'text-emerald-600' : 'text-destructive')}>{formatUSD(profitUsd)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IQD equivalent</span>
            <span className="font-mono text-muted-foreground">{formatIQD(profitIqd)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profit Margin</span>
            <span className={cn('font-mono font-medium', marginPct >= 0 ? 'text-emerald-600' : 'text-destructive')}>{marginPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-lg font-bold text-primary">{formatUSD(revenueUsd)}</p>
          <p className="text-xs text-muted-foreground">{formatIQD(revenueIqd)}</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-muted-foreground">Total Costs</p>
          <p className="text-lg font-bold">{formatUSD(costsUsd + commissionsUsd + totalFeesUsd)}</p>
          <p className="text-xs text-muted-foreground">Vendor + Commissions + Fees</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-xs text-muted-foreground">FX Impact</p>
          <p className={cn('text-lg font-bold', fxGainLossUsd >= 0 ? 'text-emerald-600' : 'text-destructive')}>{fxGainLossUsd >= 0 ? '+' : ''}{formatUSD(fxGainLossUsd)}</p>
        </div>
        <div className={cn('p-4 rounded-lg border', profitUsd >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}>
          <p className="text-xs text-muted-foreground">Net Profit</p>
          <p className={cn('text-lg font-bold', profitUsd >= 0 ? 'text-emerald-600' : 'text-destructive')}>{formatUSD(profitUsd)}</p>
          <p className="text-xs text-muted-foreground">{marginPct.toFixed(1)}% margin</p>
        </div>
      </div>

      {/* Commissions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-base font-semibold">🤝 Commission Generation</h4>
          {!isLocked && commissions.length === 0 && (
            <Button onClick={handleGenerateCommissions} disabled={insertCommission.isPending} size="sm">
              <RefreshCw className="w-4 h-4 mr-1" />Generate Commissions
            </Button>
          )}
        </div>

        {commissions.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">No commissions generated yet. Click "Generate Commissions" to auto-create commission entries based on employee rates and broker agreements.</p>
        ) : (
          <div className="erp-table-container">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Person</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Rate</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {commissions.map((c: any) => {
                  const personName = c.type === 'employee'
                    ? employees.find((e: any) => e.id === c.person_id)?.name || '—'
                    : partners.find((p: any) => p.id === c.person_id)?.company || '—';
                  return (
                    <tr key={c.id} className="border-b border-border">
                      <td className="px-3 py-2"><StatusBadge status={c.type} /></td>
                      <td className="px-3 py-2">{personName}</td>
                      <td className="px-3 py-2 text-right font-mono">{c.rate ? `${c.rate}%` : '—'}</td>
                      <td className="px-3 py-2 text-right"><CurrencyDisplay usd={c.amount_usd} iqd={c.amount_iqd} size="sm" /></td>
                      <td className="px-3 py-2 text-center"><StatusBadge status={c.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Close Order Action */}
      <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
        {isLocked ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <Lock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-semibold text-foreground">✅ Order Closed</p>
                <p className="text-muted-foreground">Closed on {order.closed_at?.split('T')[0]}. This order is locked from further modifications.</p>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleUnlockOrder}>
                <LockOpen className="w-4 h-4 mr-1" />Unlock Order
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Closing the order will lock it from further modifications. Ensure all payments are reconciled and commissions are generated.</p>
            <Button variant="destructive" onClick={handleCloseOrder} disabled={commissions.length === 0} size="lg">
              <Lock className="w-4 h-4 mr-2" />Close Order & Lock
            </Button>
            {commissions.length === 0 && <p className="text-xs text-amber-600">⚠ Generate commissions before closing</p>}
          </>
        )}
      </div>
    </div>
  );
}
