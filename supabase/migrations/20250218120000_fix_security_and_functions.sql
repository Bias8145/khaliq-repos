/*
  # Fix Security Advisories & Function Conflicts
  
  ## Description
  This migration resolves the "cannot change return type" error by explicitly dropping 
  the existing functions before recreating them with security best practices.
  
  ## Changes
  1. Drops existing RPC functions (toggle_like, increment_site_visit, increment_view_count).
  2. Recreates them with `SECURITY DEFINER` and `SET search_path = public` to fix security advisories.
  3. Enables RLS on `site_visits` and `post_likes_log`.
  4. Adds RLS policies for Admin access and public interactions.
  
  ## Safety
  - Uses `DROP FUNCTION IF EXISTS` to handle clean slates or existing bad states.
  - Does not lose data (only drops logic functions).
*/

-- 1. Drop existing functions to prevent return type/signature conflicts
DROP FUNCTION IF EXISTS public.toggle_like(uuid, text);
DROP FUNCTION IF EXISTS public.increment_site_visit();
DROP FUNCTION IF EXISTS public.increment_view_count(uuid);

-- 2. Enable RLS on new tables (if not already enabled)
ALTER TABLE IF EXISTS public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_likes_log ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Policy for site_visits: Only authenticated users (Admin) can view stats.
-- RPC handles the insertion, so we don't need an INSERT policy for anon.
DROP POLICY IF EXISTS "Admin view site_visits" ON public.site_visits;
CREATE POLICY "Admin view site_visits" ON public.site_visits
FOR SELECT TO authenticated USING (true);

-- Policy for post_likes_log: 
-- Public needs SELECT to check "Did I like this?" (via client_id query in frontend).
-- Admin needs SELECT to view detailed logs.
DROP POLICY IF EXISTS "Public view likes log" ON public.post_likes_log;
CREATE POLICY "Public view likes log" ON public.post_likes_log
FOR SELECT USING (true);

-- 4. Recreate Secure Functions (SECURITY DEFINER, search_path=public)

-- Function: increment_site_visit
-- Securely increments the daily visitor counter.
CREATE OR REPLACE FUNCTION public.increment_site_visit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.site_visits (date, count)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date)
  DO UPDATE SET count = site_visits.count + 1;
END;
$$;

-- Function: increment_view_count
-- Securely increments post view count.
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$;

-- Function: toggle_like
-- Securely toggles a like for a post/client_id pair.
CREATE OR REPLACE FUNCTION public.toggle_like(p_id uuid, c_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- Unlike: Remove log and decrement count
    DELETE FROM public.post_likes_log 
    WHERE post_id = p_id AND client_id = c_id;
    
    UPDATE public.posts 
    SET likes = GREATEST(0, likes - 1) 
    WHERE id = p_id;
  ELSE
    -- Like: Add log and increment count
    INSERT INTO public.post_likes_log (post_id, client_id)
    VALUES (p_id, c_id);
    
    UPDATE public.posts 
    SET likes = likes + 1 
    WHERE id = p_id;
  END IF;
END;
$$;
