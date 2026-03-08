import { cn } from '@/lib/utils';

type StatusVariant = 'active' | 'inactive' | 'draft' | 'sent' | 'approved' | 'rejected' | 'paid' | 'partial' | 'issued' | 'overdue' | 'pending' | 'accrued' | 'open' | 'locked' | 'closed';

const variantStyles: Record<StatusVariant, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-gray-100 text-gray-600',
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  issued: 'bg-blue-100 text-blue-800',
  overdue: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  accrued: 'bg-purple-100 text-purple-800',
  open: 'bg-blue-100 text-blue-800',
  locked: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-100 text-slate-600',
};

export function StatusBadge({ status }: { status: string }) {
  const variant = status.toLowerCase() as StatusVariant;
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      variantStyles[variant] || 'bg-gray-100 text-gray-700'
    )}>
      {status}
    </span>
  );
}
