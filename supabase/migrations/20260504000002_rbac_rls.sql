-- ============================================================
-- Refined RBAC & RLS Policies
-- =============================================

-- 1. Drop existing permissive policies
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'customers','vendors','employees','partners','cofounder_capital',
    'exchange_rates','exchange_rate_history','exchange_rate_settings',
    'orders','order_costs',
    'quotations','quotation_templates','quotation_services','quotation_payment_terms',
    'invoices','vendor_bills',
    'payments','payment_methods',
    'commissions','expenses','month_close',
    'company_settings','invoice_settings',
    'documents','audit_log',
    'payment_reminders','payment_reminder_history',
    'payment_reminder_settings','payment_reminder_templates',
    'customer_reminder_settings'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access" ON public.%I', tbl);
  END LOOP;
END $$;

-- 2. Define Granular Policies

-- Helper for common role checks
-- public.has_role(uid, role) already exists

-- ADMIN ONLY TABLES (Admin Console, Co-founder Capital, Settings)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['cofounder_capital', 'cofounder_transactions', 'cofounders', 'audit_log', 'company_settings', 'exchange_rate_settings']) LOOP
    EXECUTE format('CREATE POLICY "Admin full access" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', tbl);
  END LOOP;
END $$;

-- OPERATIONAL TABLES (Read for all, Write for Admin/Manager/User)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'customers','vendors','employees','partners',
    'orders','order_costs',
    'quotations','quotation_templates','quotation_services','quotation_payment_terms',
    'invoices','vendor_bills',
    'payments','payment_methods',
    'commissions','expenses','month_close',
    'invoice_settings',
    'documents',
    'payment_reminders','payment_reminder_history',
    'payment_reminder_settings','payment_reminder_templates',
    'customer_reminder_settings'
  ])
  LOOP
    -- Everyone authenticated can read
    EXECUTE format('CREATE POLICY "Role-based read access" ON public.%I FOR SELECT TO authenticated USING (true)', tbl);

    -- Admin, Manager, and User can Insert/Update
    EXECUTE format('CREATE POLICY "Role-based write access" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''manager'') OR public.has_role(auth.uid(), ''user'')) WITH CHECK (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''manager'') OR public.has_role(auth.uid(), ''user''))', tbl);

    -- Restrict Deletion to Admin & Manager for core operational data
    IF tbl IN ('orders', 'invoices', 'vendor_bills', 'payments', 'expenses') THEN
       EXECUTE format('DROP POLICY "Role-based write access" ON public.%I', tbl);
       EXECUTE format('CREATE POLICY "Role-based write access (restricted delete)" ON public.%I FOR INSERT OR UPDATE TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''manager'') OR public.has_role(auth.uid(), ''user''))', tbl);
       EXECUTE format('CREATE POLICY "Admin/Manager delete access" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''manager''))', tbl);
    END IF;
  END LOOP;
END $$;

-- EXCHANGE RATES (Publicly readable, Admin/Manager editable)
CREATE POLICY "Everyone read exchange rates" ON public.exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager manage exchange rates" ON public.exchange_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Everyone read rate history" ON public.exchange_rate_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager manage rate history" ON public.exchange_rate_history FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
