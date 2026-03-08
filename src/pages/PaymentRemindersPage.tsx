import { Bell, Search, Settings as SettingsIcon, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { useState, useEffect } from 'react';
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
  customer: { company: string } | null;
  invoice: { invoice_no: string; amount_usd: number; amount_iqd: number } | null;
}

export default function PaymentRemindersPage() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['payment_reminders_joined'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('payment_reminders') as any)
        .select('*, customer:customers(company), invoice:invoices(invoice_no, amount_usd, amount_iqd)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReminderRow[];
    },
  });

  const filtered = reminders.filter((r) =>
    !search || [r.customer?.company, r.invoice?.invoice_no, r.status].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const handleMarkSent = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await (supabase.from('payment_reminders') as any)
      .update({ status: 'sent', last_reminder_sent: now, reminder_count: reminders.find(r => r.id === id)!.reminder_count + 1 })
      .eq('id', id);
    if (error) toast.error(error.message);
    else {
      // Log to history
      await (supabase.from('payment_reminder_history') as any).insert({
        payment_reminder_id: id,
        status: 'sent',
        date_sent: now,
      });
      toast.success('Reminder marked as sent');
      qc.invalidateQueries({ queryKey: ['payment_reminders_joined'] });
    }
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
                    <td className="px-5 py-3 font-medium">{r.customer?.company || '—'}</td>
                    <td className="px-5 py-3 font-mono text-primary">{r.invoice?.invoice_no || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      {r.invoice ? <CurrencyDisplay usd={r.invoice.amount_usd} iqd={r.invoice.amount_iqd} size="sm" /> : '—'}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.due_date || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {r.days_overdue > 0 ? (
                        <span className="text-destructive font-mono">{r.days_overdue}d</span>
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
                            <Button variant="ghost" size="sm" onClick={() => handleMarkSent(r.id)} title="Mark as sent">
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleResolve(r.id)} title="Resolve">
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
