import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTableQuery<T = any>(table: string, options?: {
  orderBy?: string;
  ascending?: boolean;
  filter?: Record<string, any>;
}) {
  return useQuery({
    queryKey: [table, options?.filter],
    queryFn: async () => {
      let query = (supabase.from(table as any) as any).select('*');
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

export function useInsertMutation(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Record<string, any>) => {
      const { data, error } = await (supabase.from(table as any) as any).insert(record).select().single();
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

export function useUpdateMutation(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any> & { id: string }) => {
      const { data, error } = await (supabase.from(table as any) as any).update(updates).eq('id', id).select().single();
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

export function useDeleteMutation(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as any) as any).delete().eq('id', id);
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
