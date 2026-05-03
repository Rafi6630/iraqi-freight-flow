-- ============================================================
-- Generic Audit Trigger Function
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB := NULL;
  v_new_values JSONB := NULL;
  v_entity_id UUID;
  v_actor TEXT;
BEGIN
  -- Try to get the authenticated user ID from Supabase Auth
  BEGIN
    v_actor := auth.uid()::TEXT;
  EXCEPTION WHEN OTHERS THEN
    v_actor := 'system';
  END;

  IF (TG_OP = 'UPDATE') THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    v_entity_id := NEW.id;
  ELSIF (TG_OP = 'INSERT') THEN
    v_new_values := to_jsonb(NEW);
    v_entity_id := NEW.id;
  ELSIF (TG_OP = 'DELETE') THEN
    v_old_values := to_jsonb(OLD);
    v_entity_id := OLD.id;
  END IF;

  INSERT INTO public.audit_log (actor, action, entity, entity_id, old_values, new_values)
  VALUES (COALESCE(v_actor, 'anonymous'), TG_OP, TG_TABLE_NAME, v_entity_id, v_old_values, v_new_values);

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Apply Audit Triggers to Financial Tables
-- ============================================================

-- Orders
CREATE TRIGGER audit_orders_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Invoices
CREATE TRIGGER audit_invoices_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Vendor Bills
CREATE TRIGGER audit_vendor_bills_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_bills
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Payments
CREATE TRIGGER audit_payments_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Order Costs
CREATE TRIGGER audit_order_costs_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.order_costs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Expenses
CREATE TRIGGER audit_expenses_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
