import { formatUSD, formatIQD } from '@/lib/currency';

interface CurrencyDisplayProps {
  usd: number;
  iqd: number;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'inline' | 'stacked';
  showLabels?: boolean;
}

export function CurrencyDisplay({ usd, iqd, size = 'md', layout = 'inline', showLabels = false }: CurrencyDisplayProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (layout === 'stacked') {
    return (
      <div className="flex flex-col">
        <span className={`currency-usd ${sizeClasses[size]}`}>
          {showLabels && <span className="text-muted-foreground mr-1">USD</span>}
          {formatUSD(usd)}
        </span>
        <span className={`currency-iqd ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
          {formatIQD(iqd)}
        </span>
      </div>
    );
  }

  return (
    <span className={`currency-pair ${sizeClasses[size]}`}>
      <span className="currency-usd">{formatUSD(usd)}</span>
      <span className="text-muted-foreground">|</span>
      <span className="currency-iqd">{formatIQD(iqd)}</span>
    </span>
  );
}
