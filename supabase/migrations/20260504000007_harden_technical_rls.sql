-- Enable RLS on technical/internal tables
ALTER TABLE IF EXISTS public.doc_number_counters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view counters and update them (required for generate_doc_number to work)
-- Note: generate_doc_number is SECURITY DEFINER, but direct access should still be restricted if possible.
CREATE POLICY "Authenticated users can manage counters" ON public.doc_number_counters
FOR ALL TO authenticated USING (true) WITH CHECK (true);
