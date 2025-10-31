-- Create book metadata reference table
CREATE TABLE IF NOT EXISTS public.book_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn text UNIQUE,
  title text NOT NULL,
  author text,
  publisher text,
  publication_year integer,
  edition text,
  page_count integer,
  dimensions jsonb, -- {width, height, depth} in cm
  subjects text[],
  description text,
  cover_image_url text,
  metadata_source text, -- 'google_books', 'open_library', etc
  confidence_score numeric(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create AI matching settings table
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default AI matching settings
INSERT INTO public.ai_settings (setting_key, setting_value, description) VALUES
  ('matching_threshold', '98', 'Minimum confidence score (0-100) for book matching'),
  ('enable_web_lookup', 'true', 'Enable web lookup for book metadata'),
  ('enable_fact_checking', 'true', 'Enable fact-checking of matched data'),
  ('preferred_sources', '["google_books", "open_library", "isbndb"]', 'Preferred metadata sources in order'),
  ('cache_duration_days', '30', 'Days to cache book metadata'),
  ('max_image_size_mb', '10', 'Maximum image file size in MB')
ON CONFLICT (setting_key) DO NOTHING;

-- Modify books table to support multiple images and 3D data
ALTER TABLE public.books 
  ADD COLUMN IF NOT EXISTS front_image_url text,
  ADD COLUMN IF NOT EXISTS back_image_url text,
  ADD COLUMN IF NOT EXISTS binder_image_url text,
  ADD COLUMN IF NOT EXISTS inner_pages jsonb, -- array of page image urls
  ADD COLUMN IF NOT EXISTS dimensions jsonb, -- {width, height, depth}
  ADD COLUMN IF NOT EXISTS metadata_id uuid REFERENCES public.book_metadata(id),
  ADD COLUMN IF NOT EXISTS ai_extracted_data jsonb, -- raw AI extraction results
  ADD COLUMN IF NOT EXISTS isbn text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_metadata_isbn ON public.book_metadata(isbn);
CREATE INDEX IF NOT EXISTS idx_book_metadata_title ON public.book_metadata(title);
CREATE INDEX IF NOT EXISTS idx_books_metadata_id ON public.books(metadata_id);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books(isbn);

-- Enable RLS on new tables
ALTER TABLE public.book_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for book_metadata (everyone can read, system can write)
CREATE POLICY "Book metadata viewable by everyone"
  ON public.book_metadata FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert book metadata"
  ON public.book_metadata FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update book metadata"
  ON public.book_metadata FOR UPDATE
  USING (true);

-- RLS policies for ai_settings (admins only)
CREATE POLICY "AI settings viewable by admins"
  ON public.ai_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "AI settings updatable by admins"
  ON public.ai_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "AI settings insertable by admins"
  ON public.ai_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_book_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_metadata_timestamp
  BEFORE UPDATE ON public.book_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_book_metadata_timestamp();

CREATE TRIGGER update_ai_settings_timestamp
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_book_metadata_timestamp();