-- Add location and gender fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Create index for efficient geospatial queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.address IS 'User address for geocoding and map display';
COMMENT ON COLUMN public.profiles.latitude IS 'Geocoded latitude from user address';
COMMENT ON COLUMN public.profiles.longitude IS 'Geocoded longitude from user address';
COMMENT ON COLUMN public.profiles.gender IS 'User gender for map marker icon display';