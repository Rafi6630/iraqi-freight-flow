ALTER TABLE public.payments ADD COLUMN payment_fee_usd numeric DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN payment_fee_iqd numeric DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN fee_description text;