-- Missing tables for Co-Founder Equity module

CREATE TABLE IF NOT EXISTS public.cofounders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ownership_pct NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cofounder_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES public.cofounders(id) ON DELETE CASCADE NOT NULL,
  transaction_date DATE NOT NULL,
  type TEXT NOT NULL, -- contribution, withdrawal, profit_allocation
  amount_usd NUMERIC(15,2) NOT NULL,
  amount_iqd NUMERIC(18,2) NOT NULL,
  fx_rate NUMERIC(12,4) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cofounders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofounder_transactions ENABLE ROW LEVEL SECURITY;

-- Grant access (Policies already defined in 20260504000002_rbac_rls.sql using loops)
