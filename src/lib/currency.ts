// Dual Currency Engine — USD base, IQD secondary

export const DEFAULT_FX_RATE = 1310; // 1 USD = 1310 IQD (approximate)

export type CurrencyCode = 'USD' | 'IQD' | 'EUR' | 'GBP' | 'CNY' | 'OTHER';

export interface FxSnapshot {
  fx_rate: number;
  fx_date: string;
  currency_input: CurrencyCode;
  is_fx_locked: boolean;
}

export interface DualAmount {
  amount_usd: number;
  amount_iqd: number;
  fx_rate: number;
  fx_date: string;
  currency_input: CurrencyCode;
  is_fx_locked: boolean;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatIQD(amount: number): string {
  return `IQD ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function formatDualCurrency(usd: number, iqd: number): string {
  return `${formatUSD(usd)} | ${formatIQD(iqd)}`;
}

export function convertToUSD(amount: number, fromCurrency: CurrencyCode, fxRate: number): number {
  switch (fromCurrency) {
    case 'USD': return amount;
    case 'IQD': return amount / fxRate;
    default: return amount; // For EUR/GBP/CNY, would need separate rates
  }
}

export function convertToIQD(amountUsd: number, fxRate: number): number {
  return amountUsd * fxRate;
}

export function calculateDualAmount(
  amount: number,
  currency: CurrencyCode,
  fxRate: number,
  fxDate: string,
): DualAmount {
  let amountUsd: number;
  let amountIqd: number;

  if (currency === 'USD') {
    amountUsd = amount;
    amountIqd = amount * fxRate;
  } else if (currency === 'IQD') {
    amountIqd = amount;
    amountUsd = amount / fxRate;
  } else {
    amountUsd = amount; // simplified
    amountIqd = amount * fxRate;
  }

  return {
    amount_usd: Math.round(amountUsd * 100) / 100,
    amount_iqd: Math.round(amountIqd),
    fx_rate: fxRate,
    fx_date: fxDate,
    currency_input: currency,
    is_fx_locked: false,
  };
}

export function calculateFxGainLoss(
  settledUsd: number,
  docFxRate: number,
  paymentFxRate: number,
) {
  const equivalentIqd = settledUsd * docFxRate;
  const actualIqdPaid = settledUsd * paymentFxRate;
  const fxDiffIqd = actualIqdPaid - equivalentIqd;
  const fxGainLossUsd = fxDiffIqd / paymentFxRate;
  return {
    fx_gain_loss_usd: Math.round(fxGainLossUsd * 100) / 100,
    fx_gain_loss_iqd: Math.round(fxDiffIqd),
    isGain: fxDiffIqd > 0,
  };
}
