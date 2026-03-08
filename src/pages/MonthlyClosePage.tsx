import { CalendarCheck, Plus, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTableQuery, useInsertMutation, useUpdateMutation } from '@/hooks/use-supabase-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

export default function MonthlyClosePage() {
  const { data: months = [], isLoading } = useTableQuery('month_close', { orderBy: 'month_yyyy_mm', ascending: false });
  const insertMonth = useInsertMutation('month_close');
  const updateMonth = useUpdateMutation('month_close');
  const [addOpen, setAddOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState('');

  const handleAdd = () => {
    if (!newPeriod.match(/^\d{4}-\d{2}$/)) { toast.error('Use YYYY-MM format'); return; }
    insertMonth.mutate({ month_yyyy_mm: newPeriod, status: 'open' } as any);
    setAddOpen(false);
    setNewPeriod('');
  };

  const handleLock = (id: string) => updateMonth.mutate({ id, status: 'locked' } as any);
  const handleClose = (id: string) => updateMonth.mutate({ id, status: 'closed', closed_at: new Date().toISOString() } as any);

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" />
            Monthly Close
          </h1>
          <p className="erp-page-subtitle">Period management — open → lock → close</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Period</Button>
      </div>

      <div className="erp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Period</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Closed At</th>
                <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></td></tr>
              ) : months.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No periods created yet</td></tr>
              ) : (
                months.map((m: any) => (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium">{m.month_yyyy_mm}</td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={m.status} /></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{m.closed_at ? new Date(m.closed_at).toLocaleString() : '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {m.status === 'open' && <Button size="sm" variant="outline" onClick={() => handleLock(m.id)}>Lock Period</Button>}
                      {m.status === 'locked' && <Button size="sm" variant="outline" onClick={() => handleClose(m.id)}>Close Period</Button>}
                      {m.status === 'closed' && <span className="text-xs text-muted-foreground">Finalized</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Period</DialogTitle></DialogHeader>
          <div><Label>Period (YYYY-MM)</Label><Input value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} placeholder="2024-05" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
