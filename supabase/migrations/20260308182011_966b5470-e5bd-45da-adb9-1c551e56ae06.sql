
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.transport_mode AS ENUM ('sea', 'air', 'road', 'rail');
CREATE TYPE public.direction_type AS ENUM ('import', 'export');
CREATE TYPE public.commission_type AS ENUM ('pct', 'fixed');
CREATE TYPE public.commission_rule AS ENUM ('on_payment', 'on_close');
CREATE TYPE public.commission_status AS ENUM ('accrued', 'approved', 'paid');
CREATE TYPE public.payment_direction AS ENUM ('AR', 'AP');
CREATE TYPE public.payment_ref_type AS ENUM ('invoice', 'bill');
CREATE TYPE public.month_close_status AS ENUM ('open', 'locked', 'closed');
CREATE TYPE public.exchange_rate_status AS ENUM ('Active', 'Inactive');
CREATE TYPE public.update_frequency AS ENUM ('Hourly', 'Daily', 'Weekly');
CREATE TYPE public.quotation_status AS ENUM ('draft', 'sent', 'approved', 'rejected');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'partial', 'paid');
CREATE TYPE public.bill_status AS ENUM ('draft', 'issued', 'partial', 'paid');
CREATE TYPE public.reminder_status AS ENUM ('pending', 'sent', 'escalated', 'resolved');
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'viewer');

-- Helper function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- MASTER DATA
-- =============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL, contact_name TEXT, phone TEXT, email TEXT,
  city TEXT, address TEXT, payment_terms_days INT DEFAULT 30,
  credit_limit_usd NUMERIC(15,2) DEFAULT 0, status TEXT DEFAULT 'active',
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL, type TEXT, phone TEXT, email TEXT, city TEXT,
  payment_terms_days INT DEFAULT 30, rating INT DEFAULT 3,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, role TEXT, commission_rate_pct NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL, commission_type public.commission_type DEFAULT 'pct',
  rate_value NUMERIC(10,2) DEFAULT 0, status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.cofounder_capital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cofounder_name TEXT NOT NULL,
  contribution_amount_usd NUMERIC(15,2) NOT NULL,
  contribution_amount_iqd NUMERIC(18,2) NOT NULL,
  contribution_date DATE NOT NULL,
  fx_rate NUMERIC(12,4) NOT NULL, fx_date DATE NOT NULL,
  currency_input TEXT DEFAULT 'USD', is_fx_locked BOOLEAN DEFAULT true,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EXCHANGE RATES
-- =============================================
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_from TEXT NOT NULL DEFAULT 'USD', currency_to TEXT NOT NULL DEFAULT 'IQD',
  exchange_rate NUMERIC(12,4) NOT NULL, effective_date DATE NOT NULL,
  status public.exchange_rate_status DEFAULT 'Active',
  notes TEXT, updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.exchange_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_rate_id UUID REFERENCES public.exchange_rates(id) ON DELETE CASCADE,
  exchange_rate NUMERIC(12,4) NOT NULL, effective_date DATE NOT NULL,
  updated_by TEXT, status public.exchange_rate_status DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.exchange_rate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_update_enabled BOOLEAN DEFAULT false, api_provider TEXT, api_key TEXT,
  update_frequency public.update_frequency DEFAULT 'Daily',
  last_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ORDERS & COSTS
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  mode public.transport_mode NOT NULL,
  direction public.direction_type NOT NULL,
  origin_country TEXT, origin_city TEXT,
  destination_country TEXT, destination_city TEXT,
  incoterm TEXT, cargo_desc TEXT,
  weight NUMERIC(12,2), volume NUMERIC(12,2),
  packages INT, container_type TEXT,
  etd DATE, eta DATE,
  status_step INT DEFAULT 1 CHECK (status_step BETWEEN 1 AND 9),
  responsible_employee_id UUID REFERENCES public.employees(id),
  carrier_type TEXT, carrier_name TEXT,
  container_number TEXT, seal_number TEXT, equipment_size TEXT,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now(), closed_at TIMESTAMPTZ
);

CREATE TABLE public.order_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id),
  category TEXT, description TEXT, due_date DATE,
  paid_status TEXT DEFAULT 'unpaid',
  amount_usd NUMERIC(15,2) NOT NULL, amount_iqd NUMERIC(18,2) NOT NULL,
  fx_rate NUMERIC(12,4) NOT NULL, fx_date DATE NOT NULL,
  currency_input TEXT DEFAULT 'USD', is_fx_locked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- QUOTATIONS
-- =============================================
CREATE TABLE public.quotation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL, template_file_url TEXT,
  is_default BOOLEAN DEFAULT false, is_standard BOOLEAN DEFAULT true,
  company_logo_url TEXT, company_slogan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  template_id UUID REFERENCES public.quotation_templates(id),
  status public.quotation_status DEFAULT 'draft',
  margin_pct NUMERIC(5,2),
  service_fee_usd NUMERIC(15,2), service_fee_iqd NUMERIC(18,2),
  total_usd NUMERIC(15,2), total_iqd NUMERIC(18,2),
  fx_rate NUMERIC(12,4), fx_date DATE,
  currency_input TEXT DEFAULT 'USD', is_fx_locked BOOLEAN DEFAULT false,
  validity_days INT DEFAULT 30, quotation_description TEXT,
  pdf_url TEXT, signed_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), approved_at TIMESTAMPTZ
);

CREATE TABLE public.quotation_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  vendor_cost_usd NUMERIC(15,2), vendor_cost_iqd NUMERIC(18,2),
  margin_pct NUMERIC(5,2),
  service_fee_usd NUMERIC(15,2), service_fee_iqd NUMERIC(18,2),
  quoted_price_usd NUMERIC(15,2), quoted_price_iqd NUMERIC(18,2),
  fx_rate NUMERIC(12,4), fx_date DATE
);

CREATE TABLE public.quotation_payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  description TEXT, percentage NUMERIC(5,2),
  amount_usd NUMERIC(15,2), amount_iqd NUMERIC(18,2),
  currency TEXT DEFAULT 'USD'
);

-- =============================================
-- INVOICES & BILLS
-- =============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  customer_id UUID REFERENCES public.customers(id),
  status public.invoice_status DEFAULT 'draft',
  amount_usd NUMERIC(15,2) NOT NULL, amount_iqd NUMERIC(18,2) NOT NULL,
  fx_rate NUMERIC(12,4) NOT NULL, fx_date DATE NOT NULL,
  currency_input TEXT DEFAULT 'USD', is_fx_locked BOOLEAN DEFAULT true,
  issued_date DATE, due_date DATE,
  paid_usd NUMERIC(15,2) DEFAULT 0, paid_iqd NUMERIC(18,2) DEFAULT 0,
  pdf_url TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id),
  vendor_id UUID REFERENCES public.vendors(id),
  status public.bill_status DEFAULT 'draft',
  amount_usd NUMERIC(15,2) NOT NULL, amount_iqd NUMERIC(18,2) NOT NULL,
  fx_rate NUMERIC(12,4) NOT NULL, fx_date DATE NOT NULL,
  currency_input TEXT DEFAULT 'USD', is_fx_locked BOOLEAN DEFAULT true,
  issued_date DATE, due_date DATE,
  paid_usd NUMERIC(15,2) DEFAULT 0, paid_iqd NUMERIC(18,2) DEFAULT 0,
  pdf_url TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PAYMENTS
-- =============================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_type TEXT NOT NULL, bank_name TEXT, account_number TEXT,
  account_holder_name TEXT, currency TEXT DEFAULT 'USD',
  swift_code TEXT, iban TEXT, routing_number TEXT,
  is_default BOOLEAN DEFAULT false, status TEXT DEFAULT 'active',
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_no TEXT NOT NULL UNIQUE,
  direction public.payment_direction NOT NULL,
  ref_type public.payment_ref_type NOT NULL,
  ref_id UUID, order_id UUID REFERENCES public.orders(id),
  counterparty_id UUID, pay_currency TEXT DEFAULT 'USD',
  amount_usd NUMERIC(15,2) NOT NULL, amount_iqd NUMERIC(18,2) NOT NULL,
  fx_rate NUMERIC(12,4) NOT NULL, fx_date DATE NOT NULL,
  currency_input TEXT DEFAULT 'USD', is_fx_locked BOOLEAN DEFAULT true,
  method TEXT, payment_method_id UUID REFERENCES public.payment_methods(id),
  reference TEXT, notes TEXT,
  fx_gain_loss_usd NUMERIC(15,2) DEFAULT 0, fx_gain_loss_iqd NUMERIC(18,2) DEFAULT 0,
  date DATE NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- OTHER FINANCIAL
-- =============================================
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  type TEXT NOT NULL, person_id UUID,
  rule public.commission_rule DEFAULT 'on_close',
  rate NUMERIC(5,2),
  amount_usd NUMERIC(15,2) NOT NULL, amount_iqd NUMERIC(18,2) NOT NULL,
  fx_rate NUMERIC(12,4) NOT NULL, fx_date DATE NOT NULL,
  currency_input TEXT DEFAULT 'USD', is_fx_locked BOOLEAN DEFAULT true,
  status public.commission_status DEFAULT 'accrued',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exp_no TEXT NOT NULL UNIQUE, category TEXT, description TEXT,
  amount_usd NUMERIC(15,2) NOT NULL, amount_iqd NUMERIC(18,2) NOT NULL,
  fx_rate NUMERIC(12,4) NOT NULL, fx_date DATE NOT NULL,
  currency_input TEXT DEFAULT 'USD', is_fx_locked BOOLEAN DEFAULT true,
  date DATE NOT NULL, receipt_url TEXT, notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE public.month_close (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_yyyy_mm TEXT NOT NULL UNIQUE,
  status public.month_close_status DEFAULT 'open',
  closed_at TIMESTAMPTZ, snapshot_json JSONB
);

-- =============================================
-- SETTINGS & SYSTEM
-- =============================================
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT, legal_name TEXT, tax_id TEXT, industry TEXT,
  street TEXT, city TEXT, state TEXT, postal_code TEXT, country TEXT,
  default_currency TEXT DEFAULT 'USD', phone TEXT, email TEXT, website TEXT,
  time_zone TEXT DEFAULT 'Asia/Baghdad',
  company_logo_url TEXT, company_slogan TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_prefix TEXT DEFAULT 'INV', invoice_next_number INT DEFAULT 1,
  default_payment_terms INT DEFAULT 30, late_fee_percentage NUMERIC(5,2) DEFAULT 0,
  template_id UUID, footer_text TEXT, payment_instructions TEXT,
  show_tax_details BOOLEAN DEFAULT false, auto_send_invoices BOOLEAN DEFAULT false,
  require_po_number BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL, document_url TEXT,
  entity_type TEXT, entity_id UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT, action TEXT NOT NULL, entity TEXT NOT NULL,
  entity_id UUID, details TEXT, old_values JSONB, new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- =============================================
-- PAYMENT REMINDERS
-- =============================================
CREATE TABLE public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  due_date DATE, days_overdue INT DEFAULT 0,
  last_reminder_sent TIMESTAMPTZ, next_reminder_scheduled TIMESTAMPTZ,
  reminder_count INT DEFAULT 0, status public.reminder_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.payment_reminder_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reminder_id UUID REFERENCES public.payment_reminders(id) ON DELETE CASCADE,
  date_sent TIMESTAMPTZ DEFAULT now(), template_used TEXT,
  recipient_email TEXT, status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.payment_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_1_days_before INT DEFAULT 3, reminder_2_days_before INT DEFAULT 0,
  reminder_3_days_after INT DEFAULT 7, reminder_4_days_after INT DEFAULT 14,
  reminder_5_days_after INT DEFAULT 30,
  reminder_1_enabled BOOLEAN DEFAULT true, reminder_2_enabled BOOLEAN DEFAULT true,
  reminder_3_enabled BOOLEAN DEFAULT true, reminder_4_enabled BOOLEAN DEFAULT true,
  reminder_5_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.payment_reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL, subject TEXT, body TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.customer_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  reminders_enabled BOOLEAN DEFAULT true,
  custom_schedule_enabled BOOLEAN DEFAULT false, opt_out_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofounder_capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.month_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminder_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reminder_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated full access on operational tables
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
    EXECUTE format('CREATE POLICY "Authenticated full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status_step);
CREATE INDEX idx_order_costs_order ON public.order_costs(order_id);
CREATE INDEX idx_invoices_order ON public.invoices(order_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_vendor_bills_order ON public.vendor_bills(order_id);
CREATE INDEX idx_vendor_bills_vendor ON public.vendor_bills(vendor_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_commissions_order ON public.commissions(order_id);
CREATE INDEX idx_exchange_rates_lookup ON public.exchange_rates(currency_from, currency_to, effective_date DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity, entity_id);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exchange_rate_settings_updated_at BEFORE UPDATE ON public.exchange_rate_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_settings_updated_at BEFORE UPDATE ON public.invoice_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_reminders_updated_at BEFORE UPDATE ON public.payment_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_reminder_settings_updated_at BEFORE UPDATE ON public.payment_reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_reminder_templates_updated_at BEFORE UPDATE ON public.payment_reminder_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_reminder_settings_updated_at BEFORE UPDATE ON public.customer_reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
