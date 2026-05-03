import { Bell, Search, Settings as SettingsIcon, Loader2, Send, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ReminderRow {
  id: string;
  status: string;
  days_overdue: number;
  due_date: string;
  reminder_count: number;
  last_reminder_sent: string | null;
  next_reminder_scheduled: string | null;
  customer: { company: string; email?: string } | null;
  invoice: { invoice_no: string; amount_usd: number; amount_iqd: number } | null;
}

export default function PaymentRemindersPage() {
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const qc = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['payment_reminders_joined'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('payment_reminders') as any)
        .select('*, customer:customers(company, email), invoice:invoices(invoice_no, amount_usd, amount_iqd)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReminderRow[];
    },
  });

  const filtered = reminders.filter((r) =>
    !search || [r.customer?.company, r.invoice?.invoice_no, r.status].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = reminders.filter(r => r.status === 'pending' || r.status === 'sent').length;

  const handleMarkSent = async (id: string) => {
    const now = new Date().toISOString();
    const current = reminders.find(r => r.id === id);
    if (!current) return;

    const { error } = await (supabase.from('payment_reminders') as any)
      .update({
        status: 'sent',
        last_reminder_sent: now,
        reminder_count: (current.reminder_count || 0) + 1
      })
      .eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      await (supabase.from('payment_reminder_history') as any).insert({
        payment_reminder_id: id,
        status: 'sent',
        date_sent: now,
        recipient_email: current.customer?.email || 'unknown@client.com'
      });
      toast.success('Reminder marked as sent');
      qc.invalidateQueries({ queryKey: ['payment_reminders_joined'] });
    }
  };

  const handleSendAll = async () => {
    const toSend = reminders.filter(r => (r.status === 'pending' || r.status === 'sent') && r.days_overdue > 0);
    if (toSend.length === 0) {
      toast.info("No overdue pending reminders to send.");
      return;
    }

    setIsSending(true);
    let successCount = 0;

    for (const r of toSend) {
       try {
          // In a real system, this would call an Edge Function to send actual email
          // For now, we simulate the process and log it
          const now = new Date().toISOString();
          await (supabase.from('payment_reminders') as any)
            .update({
              status: 'sent',
              last_reminder_sent: now,
              reminder_count: (r.reminder_count || 0) + 1
            })
            .eq('id', r.id);

          await (supabase.from('payment_reminder_history') as any).insert({
            payment_reminder_id: r.id,
            status: 'sent',
            date_sent: now,
            recipient_email: r.customer?.email || 'auto-placeholder@client.com',
            template_used: 'Standard Overdue Notice'
          });
          successCount++;
       } catch (e) {
          console.error("Failed to send reminder for", r.id, e);
       }
    }

    setIsSending(false);
    toast.success(`Successfully processed ${successCount} reminders.`);
    qc.invalidateQueries({ queryKey: ['payment_reminders_joined'] });
  };

  const handleResolve = async (id: string) => {
    const { error } = await (supabase.from('payment_reminders') as any).update({ status: 'resolved' }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Resolved'); qc.invalidateQueries({ queryKey: ['payment_reminders_joined'] }); }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Payment Reminders
          </h1>
          <p className="erp-page-subtitle">Automated AR Collection System</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={handleSendAll}
            disabled={isSending || reminders.length === 0}
            className="bg-primary hover:bg-primary/90"
          >
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MailCheck className="w-4 h-4 mr-2" />}
            Send All Overdue Reminders
          </Button>
          <Button variant="outline" size="icon" title="Notification Settings">
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="erp-metric-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Active Reminders</p>
          <p className="text-2xl font-bold mt-1">{pendingCount}</p>
        </div>
        <div className="erp-metric-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Overdue Invoices</p>
          <p className="text-2xl font-bold mt-1 text-destructive">
            {reminders.filter(r => r.days_overdue > 0 && r.status !== 'resolved').length}
          </p>
        </div>
        <div className="erp-metric-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Resolved This Month</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            {reminders.filter(r => r.status === 'resolved').length}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search reminders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Invoice</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Amount Due</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Days Overdue</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Sent #</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">No payment reminders found</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">
                      <div className="flex flex-col">
                        <span>{r.customer?.company || '—'}</span>
                        <span className="text-[10px] text-muted-foreground">{r.customer?.email || 'No email'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-primary">{r.invoice?.invoice_no || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      {r.invoice ? <CurrencyDisplay usd={r.invoice.amount_usd} iqd={r.invoice.amount_iqd} size="sm" /> : '—'}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{r.due_date || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {r.days_overdue > 0 ? (
                        <span className="text-destructive font-bold font-mono bg-destructive/10 px-1.5 py-0.5 rounded">{r.days_overdue}d</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center font-mono">{r.reminder_count}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.status !== 'resolved' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkSent(r.id)}
                              title="Send Reminder Now"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolve(r.id)}
                              title="Mark as Resolved"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              ✓
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
