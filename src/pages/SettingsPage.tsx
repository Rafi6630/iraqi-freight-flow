import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTableQuery, useInsertMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/use-supabase-query';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function useSettingsRow(table: string) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: [table, 'singleton'],
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as any) as any).select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (data?.id) {
        const { error } = await (supabase.from(table as any) as any).update(values).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from(table as any) as any).insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table, 'singleton'] });
      toast.success('Settings saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { data, isLoading, upsert };
}

export default function SettingsPage() {
  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="erp-page-subtitle">System configuration</p>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="exchange">Exchange Rates</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="company"><CompanyTab /></TabsContent>
        <TabsContent value="invoices"><InvoiceTab /></TabsContent>
        <TabsContent value="users" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">User Management</h3>
          <p className="text-sm text-muted-foreground">Invite users, assign roles, manage access.</p>
          <Button>Invite User</Button>
        </TabsContent>
        <TabsContent value="templates"><QuotationTemplatesTab /></TabsContent>
        <TabsContent value="notifications" className="erp-metric-card space-y-4">
          <h3 className="text-lg font-semibold">Notification Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Email on new order</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>Email on payment received</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>Alert on overdue invoice</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>FX rate change alerts</Label><Switch /></div>
          </div>
          <Button>Save Preferences</Button>
        </TabsContent>
        <TabsContent value="exchange"><ExchangeRateSettingsTab /></TabsContent>
        <TabsContent value="payment-methods"><PaymentMethodsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyTab() {
  const { data, isLoading, upsert } = useSettingsRow('company_settings');
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const f = (k: string) => form[k] ?? '';
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return <div className="erp-metric-card p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="erp-metric-card space-y-4">
      <h3 className="text-lg font-semibold">Company Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Company Name</Label><Input value={f('company_name')} onChange={e => set('company_name', e.target.value)} /></div>
        <div><Label>Legal Name</Label><Input value={f('legal_name')} onChange={e => set('legal_name', e.target.value)} /></div>
        <div><Label>Tax ID</Label><Input value={f('tax_id')} onChange={e => set('tax_id', e.target.value)} /></div>
        <div><Label>Industry</Label><Input value={f('industry')} onChange={e => set('industry', e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={f('phone')} onChange={e => set('phone', e.target.value)} /></div>
        <div><Label>Email</Label><Input value={f('email')} onChange={e => set('email', e.target.value)} /></div>
        <div><Label>Website</Label><Input value={f('website')} onChange={e => set('website', e.target.value)} /></div>
        <div><Label>Default Currency</Label><Input value={f('default_currency')} onChange={e => set('default_currency', e.target.value)} /></div>
        <div><Label>Country</Label><Input value={f('country')} onChange={e => set('country', e.target.value)} /></div>
        <div><Label>City</Label><Input value={f('city')} onChange={e => set('city', e.target.value)} /></div>
        <div><Label>Company Slogan</Label><Input value={f('company_slogan')} onChange={e => set('company_slogan', e.target.value)} /></div>
        <div><Label>Timezone</Label><Input value={f('time_zone')} onChange={e => set('time_zone', e.target.value)} /></div>
      </div>
      <Button onClick={() => {
        const { id, created_at, updated_at, ...values } = form;
        upsert.mutate(values);
      }} disabled={upsert.isPending}>
        {upsert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Company Settings
      </Button>
    </div>
  );
}

function InvoiceTab() {
  const { data, isLoading, upsert } = useSettingsRow('invoice_settings');
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const f = (k: string) => form[k] ?? '';
  const fb = (k: string) => form[k] ?? false;
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return <div className="erp-metric-card p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="erp-metric-card space-y-4">
      <h3 className="text-lg font-semibold">Invoice Settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Invoice Prefix</Label><Input value={f('invoice_prefix')} onChange={e => set('invoice_prefix', e.target.value)} /></div>
        <div><Label>Next Number</Label><Input type="number" value={f('invoice_next_number')} onChange={e => set('invoice_next_number', parseInt(e.target.value) || 1)} /></div>
        <div><Label>Default Payment Terms (days)</Label><Input type="number" value={f('default_payment_terms')} onChange={e => set('default_payment_terms', parseInt(e.target.value) || 30)} /></div>
        <div><Label>Late Fee %</Label><Input type="number" value={f('late_fee_percentage')} onChange={e => set('late_fee_percentage', parseFloat(e.target.value) || 0)} /></div>
        <div className="md:col-span-2"><Label>Footer Text</Label><Input value={f('footer_text')} onChange={e => set('footer_text', e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Payment Instructions</Label><Input value={f('payment_instructions')} onChange={e => set('payment_instructions', e.target.value)} /></div>
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2"><Switch checked={fb('auto_send_invoices')} onCheckedChange={v => set('auto_send_invoices', v)} /><Label>Auto-send Invoices</Label></div>
        <div className="flex items-center gap-2"><Switch checked={fb('require_po_number')} onCheckedChange={v => set('require_po_number', v)} /><Label>Require PO Number</Label></div>
        <div className="flex items-center gap-2"><Switch checked={fb('show_tax_details')} onCheckedChange={v => set('show_tax_details', v)} /><Label>Show Tax Details</Label></div>
      </div>
      <Button onClick={() => {
        const { id, created_at, updated_at, ...values } = form;
        upsert.mutate(values);
      }} disabled={upsert.isPending}>
        {upsert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Invoice Settings
      </Button>
    </div>
  );
}

function PaymentMethodsTab() {
  const { data: methods = [], isLoading } = useTableQuery<any>('payment_methods');
  const insertMethod = useInsertMutation('payment_methods');
  const updateMethod = useUpdateMutation('payment_methods');
  const deleteMethod = useDeleteMutation('payment_methods');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    method_type: 'Bank Transfer', bank_name: '', account_holder_name: '',
    account_number: '', iban: '', swift_code: '', routing_number: '',
    currency: 'USD', is_default: false, notes: '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    await insertMethod.mutateAsync(form);
    setOpen(false);
    setForm({ method_type: 'bank_transfer', bank_name: '', account_holder_name: '', account_number: '', iban: '', swift_code: '', routing_number: '', currency: 'USD', is_default: false, notes: '' });
  };

  if (isLoading) return <div className="erp-metric-card p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="erp-metric-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payment Methods</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Payment Method</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Payment Method</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Type</Label>
                <Select value={form.method_type} onValueChange={v => set('method_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Hawala">Hawala (Exchange Office)</SelectItem>
                    <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                    <SelectItem value="Wire Transfer">Wire Transfer</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} /></div>
              <div><Label>Account Holder</Label><Input value={form.account_holder_name} onChange={e => set('account_holder_name', e.target.value)} /></div>
              <div><Label>Account Number</Label><Input value={form.account_number} onChange={e => set('account_number', e.target.value)} /></div>
              <div><Label>IBAN</Label><Input value={form.iban} onChange={e => set('iban', e.target.value)} /></div>
              <div><Label>SWIFT Code</Label><Input value={form.swift_code} onChange={e => set('swift_code', e.target.value)} /></div>
              <div><Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => set('currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={v => set('is_default', v)} /><Label>Default Method</Label></div>
              <Button onClick={handleSave} className="w-full" disabled={insertMethod.isPending}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {methods.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payment methods configured.</p>
      ) : (
        <div className="erp-table-container">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bank</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Account</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Currency</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Default</th>
              <th className="w-10"></th>
            </tr></thead>
            <tbody>
              {methods.map((m: any) => (
                <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-2 capitalize">{m.method_type?.replace('_', ' ')}</td>
                  <td className="px-4 py-2">{m.bank_name || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{m.account_number ? `***${m.account_number.slice(-4)}` : m.iban ? `***${m.iban.slice(-4)}` : '—'}</td>
                  <td className="px-4 py-2">{m.currency}</td>
                  <td className="px-4 py-2 text-center">{m.is_default ? '✅' : ''}</td>
                  <td className="px-4 py-2"><Button variant="ghost" size="sm" onClick={() => deleteMethod.mutate(m.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuotationTemplatesTab() {
  const { data: templates = [], isLoading } = useTableQuery<any>('quotation_templates');
  const insertTemplate = useInsertMutation('quotation_templates');
  const updateTemplate = useUpdateMutation('quotation_templates');
  const deleteTemplate = useDeleteMutation('quotation_templates');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    template_name: '', company_logo_url: '', company_slogan: '',
    is_default: false, is_standard: true,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.template_name) { toast.error('Template name required'); return; }
    if (editId) {
      await updateTemplate.mutateAsync({ id: editId, ...form });
    } else {
      await insertTemplate.mutateAsync(form);
    }
    setOpen(false);
    setEditId(null);
    setForm({ template_name: '', company_logo_url: '', company_slogan: '', is_default: false, is_standard: true });
  };

  const handleEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      template_name: t.template_name || '', company_logo_url: t.company_logo_url || '',
      company_slogan: t.company_slogan || '', is_default: t.is_default || false, is_standard: t.is_standard ?? true,
    });
    setOpen(true);
  };

  if (isLoading) return <div className="erp-metric-card p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="erp-metric-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Quotation Templates</h3>
          <p className="text-sm text-muted-foreground">Manage templates for quotation PDF generation.</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); setForm({ template_name: '', company_logo_url: '', company_slogan: '', is_default: false, is_standard: true }); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Template</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Quotation Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Template Name *</Label><Input value={form.template_name} onChange={e => set('template_name', e.target.value)} placeholder="e.g. Standard Quotation" /></div>
              <div><Label>Company Logo URL</Label><Input value={form.company_logo_url} onChange={e => set('company_logo_url', e.target.value)} placeholder="https://..." /></div>
              <div><Label>Company Slogan</Label><Input value={form.company_slogan} onChange={e => set('company_slogan', e.target.value)} placeholder="Your trusted partner..." /></div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={v => set('is_default', v)} /><Label>Default Template</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_standard} onCheckedChange={v => set('is_standard', v)} /><Label>Standard</Label></div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={insertTemplate.isPending || updateTemplate.isPending}>
                {editId ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No quotation templates configured.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: any) => (
            <div key={t.id} className="p-4 border border-border rounded-lg space-y-2 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{t.template_name}</p>
                  <div className="flex gap-2 mt-1">
                    {t.is_default && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>}
                    {t.is_standard && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Standard</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteTemplate.mutate(t.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </div>
              {t.company_slogan && <p className="text-xs text-muted-foreground">{t.company_slogan}</p>}
              {t.company_logo_url && <p className="text-xs text-muted-foreground truncate">Logo: {t.company_logo_url}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
