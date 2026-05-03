-- Add category column to documents table
ALTER TABLE IF EXISTS public.documents
ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';

-- Update existing documents if any (though they might already have it or be empty)
COMMENT ON COLUMN public.documents.category IS 'Document classification: bl, packing_list, coo, invoice, bill, other';
