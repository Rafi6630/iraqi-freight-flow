import { Lock } from 'lucide-react';

export function FxLockedBadge({ rate, date }: { rate?: number; date?: string }) {
  return (
    <span className="fx-locked-badge">
      <Lock className="w-3 h-3" />
      {rate && date ? `FX Locked: ${rate.toLocaleString()} (${date})` : 'FX Locked 🔒'}
    </span>
  );
}
