-- ============================================================
-- Customs & Clearance Enhancements
-- ============================================================

-- Add customs fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS hs_codes TEXT,
ADD COLUMN IF NOT EXISTS customs_broker_id UUID REFERENCES public.vendors(id),
ADD COLUMN IF NOT EXISTS declaration_number TEXT,
ADD COLUMN IF NOT EXISTS duty_amount_usd NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS customs_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS clearance_date DATE;

-- Create index for customs status
CREATE INDEX IF NOT EXISTS idx_orders_customs_status ON public.orders(customs_status);
