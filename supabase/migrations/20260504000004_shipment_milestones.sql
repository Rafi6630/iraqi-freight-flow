-- ============================================================
-- Shipment Milestones
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shipment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  milestone_name TEXT NOT NULL,
  location TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.shipment_milestones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone read milestones" ON public.shipment_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Manager/User manage milestones" ON public.shipment_milestones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

-- Audit Trigger
CREATE TRIGGER audit_shipment_milestones_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.shipment_milestones
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Index
CREATE INDEX IF NOT EXISTS idx_milestones_order_id ON public.shipment_milestones(order_id);
