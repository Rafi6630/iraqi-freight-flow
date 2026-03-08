import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TableName = 'customers' | 'vendors' | 'employees' | 'partners' | 'cofounder_capital' |
  'exchange_rates' | 'orders' | 'order_costs' | 'quotations' | 'invoices' | 'vendor_bills' |
  'payments' | 'commissions' | 'expenses' | 'month_close' | 'payment_methods' |
  'company_settings' | 'invoice_settings' | 'documents' | 'audit_log' |
  'quotation_templates' | 'quotation_services' | 'quotation_payment_terms' |
  'exchange_rate_history' | 'exchange_rate_settings' |
  'payment_reminders' | 'payment_reminder_history' | 'payment_reminder_settings' |
  'payment_reminder_templates' | 'customer_reminder_settings' | 'user_roles';

export function useTableQuery<T = any>(table: TableName, options?: {
  orderBy?: string;
  ascending?: boolean;
  filter?: Record<string, any>;
}) {
  return useQuery({
    queryKey: [table, options?.filter],
    queryFn: async () => {
      let query = supabase.from(table).select('*');
      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },
  });
}

export function useInsertMutation(table: TableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Record<string, any>) => {
      const { data, error } = await supabase.from(table).insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Record created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
}

export function useUpdateMutation(table: TableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any> & { id: string }) => {
      const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Record updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useDeleteMutation(table: TableName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Record deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
