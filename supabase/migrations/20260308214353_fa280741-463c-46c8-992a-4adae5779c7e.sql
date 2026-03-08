
-- Create storage bucket for signed quotation PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-quotations', 'signed-quotations', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to signed-quotations bucket
CREATE POLICY "Authenticated users can upload signed quotations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signed-quotations');

-- Allow authenticated users to read from signed-quotations bucket
CREATE POLICY "Authenticated users can read signed quotations"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signed-quotations');

-- Allow authenticated users to update signed quotations
CREATE POLICY "Authenticated users can update signed quotations"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'signed-quotations');

-- Allow authenticated users to delete signed quotations
CREATE POLICY "Authenticated users can delete signed quotations"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'signed-quotations');
