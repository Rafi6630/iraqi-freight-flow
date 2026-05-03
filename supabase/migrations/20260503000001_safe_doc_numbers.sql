-- ============================================================
-- Safe document number generation (replaces all client-side
-- orders.length + 1 patterns). Uses a single advisory-locked
-- counter per prefix+year so concurrent inserts never collide.
-- ============================================================

-- Persistent counter table (one row per prefix+year)
CREATE TABLE IF NOT EXISTS public.doc_number_counters (
  prefix      TEXT    NOT NULL,
  year        INT     NOT NULL,
  last_seq    INT     NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);

-- Lock helpers so concurrent calls serialize per prefix+year
-- (pg_advisory_xact_lock takes a bigint; we hash the key)
CREATE OR REPLACE FUNCTION public.generate_doc_number(
  p_prefix  TEXT,
  p_year    INT  DEFAULT EXTRACT(YEAR FROM now())::INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq  INT;
  v_lock BIGINT;
BEGIN
  -- Deterministic lock key from prefix+year (no collision risk for our prefixes)
  v_lock := ('x' || LEFT(md5(p_prefix || p_year::TEXT), 15))::BIT(60)::BIGINT;
  PERFORM pg_advisory_xact_lock(v_lock);

  INSERT INTO public.doc_number_counters (prefix, year, last_seq)
  VALUES (p_prefix, p_year, 1)
  ON CONFLICT (prefix, year)
  DO UPDATE SET last_seq = doc_number_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN p_prefix || '-' || p_year::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- Grant execute to authenticated users (Supabase anon/service roles)
GRANT EXECUTE ON FUNCTION public.generate_doc_number(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_doc_number(TEXT, INT) TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.doc_number_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.doc_number_counters TO service_role;

-- ============================================================
-- Seed counters from existing data so renumbering never
-- clashes with records already in the database.
-- ============================================================
DO $$
DECLARE
  v_year INT;
  v_max  INT;
BEGIN
  -- Orders: ORD-YYYY-NNNN
  FOR v_year IN SELECT DISTINCT EXTRACT(YEAR FROM created_at)::INT
                FROM public.orders WHERE order_no LIKE 'ORD-%' LOOP
    SELECT COALESCE(MAX(
      (regexp_match(order_no, 'ORD-\d{4}-(\d+)'))[1]::INT
    ), 0) INTO v_max FROM public.orders
    WHERE order_no LIKE 'ORD-' || v_year || '-%';

    INSERT INTO public.doc_number_counters (prefix, year, last_seq)
    VALUES ('ORD', v_year, v_max)
    ON CONFLICT (prefix, year) DO UPDATE SET last_seq = GREATEST(doc_number_counters.last_seq, v_max);
  END LOOP;

  -- Quotations: Q-YYYY-NNNN
  FOR v_year IN SELECT DISTINCT EXTRACT(YEAR FROM created_at)::INT
                FROM public.quotations WHERE quote_no LIKE 'Q-%' LOOP
    SELECT COALESCE(MAX(
      (regexp_match(quote_no, 'Q-\d{4}-(\d+)'))[1]::INT
    ), 0) INTO v_max FROM public.quotations
    WHERE quote_no LIKE 'Q-' || v_year || '-%';

    INSERT INTO public.doc_number_counters (prefix, year, last_seq)
    VALUES ('Q', v_year, v_max)
    ON CONFLICT (prefix, year) DO UPDATE SET last_seq = GREATEST(doc_number_counters.last_seq, v_max);
  END LOOP;

  -- Invoices: INV-YYYY-NNNN
  FOR v_year IN SELECT DISTINCT EXTRACT(YEAR FROM created_at)::INT
                FROM public.invoices WHERE invoice_no LIKE 'INV-%' LOOP
    SELECT COALESCE(MAX(
      (regexp_match(invoice_no, 'INV-\d{4}-(\d+)'))[1]::INT
    ), 0) INTO v_max FROM public.invoices
    WHERE invoice_no LIKE 'INV-' || v_year || '-%';

    INSERT INTO public.doc_number_counters (prefix, year, last_seq)
    VALUES ('INV', v_year, v_max)
    ON CONFLICT (prefix, year) DO UPDATE SET last_seq = GREATEST(doc_number_counters.last_seq, v_max);
  END LOOP;

  -- Vendor Bills: BILL-YYYY-NNNN
  FOR v_year IN SELECT DISTINCT EXTRACT(YEAR FROM created_at)::INT
                FROM public.vendor_bills WHERE bill_no LIKE 'BILL-%' LOOP
    SELECT COALESCE(MAX(
      (regexp_match(bill_no, 'BILL-\d{4}-(\d+)'))[1]::INT
    ), 0) INTO v_max FROM public.vendor_bills
    WHERE bill_no LIKE 'BILL-' || v_year || '-%';

    INSERT INTO public.doc_number_counters (prefix, year, last_seq)
    VALUES ('BILL', v_year, v_max)
    ON CONFLICT (prefix, year) DO UPDATE SET last_seq = GREATEST(doc_number_counters.last_seq, v_max);
  END LOOP;
END;
$$;
