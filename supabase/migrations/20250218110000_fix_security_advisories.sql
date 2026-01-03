/*
  # Fix Security Advisories
  
  ## Security Updates
  1. Enable RLS on `site_visits` and `post_likes_log` tables (Critical)
  2. Add RLS policies for public access where necessary
  3. Secure RPC functions by setting `search_path` and `SECURITY DEFINER` (Warning)

  ## Impact
  - Tables will now be protected by RLS.
  - Functions will be secure against search_path hijacking.
  - Analytics and Likes will function correctly for all users via secured RPCs.
*/

-- 1. Enable RLS on Analytics Tables
ALTER TABLE IF EXISTS public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_likes_log ENABLE ROW LEVEL SECURITY;

-- 2. Policies for site_visits
-- Allow anyone to read visit stats (needed for client-side analytics display in Admin Dashboard)
DROP POLICY IF EXISTS "Allow public select visits" ON public.site_visits;
CREATE POLICY "Allow public select visits" ON public.site_visits FOR SELECT USING (true);

-- Note: We do not need an INSERT policy for site_visits because we use a SECURITY DEFINER function to write to it.

-- 3. Policies for post_likes_log
-- Allow anyone to read likes (needed to check if a user has liked a post)
DROP POLICY IF EXISTS "Allow public select likes log" ON public.post_likes_log;
CREATE POLICY "Allow public select likes log" ON public.post_likes_log FOR SELECT USING (true);

-- 4. Secure Functions (Set search_path AND ensure SECURITY DEFINER)

-- increment_site_visit: Run as owner (SECURITY DEFINER) to bypass RLS for the write
CREATE OR REPLACE FUNCTION public.increment_site_visit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.site_visits (date, count)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date)
  DO UPDATE SET count = site_visits.count + 1;
END;
$$;

-- increment_view_count: Run as owner to bypass RLS on posts update
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$;

-- toggle_like: Run as owner to handle like logic securely
CREATE OR REPLACE FUNCTION public.toggle_like(p_id uuid, c_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  exists_check boolean;
BEGIN
  -- Check if like exists
  SELECT EXISTS (
    SELECT 1 FROM public.post_likes_log 
    WHERE post_id = p_id AND client_id = c_id
  ) INTO exists_check;

  IF exists_check THEN
    -- Unlike
    DELETE FROM public.post_likes_log WHERE post_id = p_id AND client_id = c_id;
    UPDATE public.posts SET likes = GREATEST(0, likes - 1) WHERE id = p_id;
  ELSE
    -- Like
    INSERT INTO public.post_likes_log (post_id, client_id) VALUES (p_id, c_id);
    UPDATE public.posts SET likes = likes + 1 WHERE id = p_id;
  END IF;
END;
$$;
