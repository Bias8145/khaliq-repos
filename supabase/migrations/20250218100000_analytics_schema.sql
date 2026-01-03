-- Create a table for tracking daily site visits
CREATE TABLE IF NOT EXISTS site_visits (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0
);

-- Create a table for tracking detailed likes (who liked what)
-- We use a client_id (generated UUID stored in localstorage) to track unique likes anonymously
CREATE TABLE IF NOT EXISTS post_likes_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, client_id)
);

-- Function to increment site visits safely
CREATE OR REPLACE FUNCTION increment_site_visit()
RETURNS void AS $$
BEGIN
  INSERT INTO site_visits (date, count)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date)
  DO UPDATE SET count = site_visits.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle like (Like/Unlike) and update the main posts counter
CREATE OR REPLACE FUNCTION toggle_like(p_id UUID, c_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  exists_check BOOLEAN;
BEGIN
  -- Check if like exists
  SELECT EXISTS(SELECT 1 FROM post_likes_log WHERE post_id = p_id AND client_id = c_id) INTO exists_check;

  IF exists_check THEN
    -- Unlike: Remove log and decrement count
    DELETE FROM post_likes_log WHERE post_id = p_id AND client_id = c_id;
    UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = p_id;
    RETURN FALSE; -- Liked = false
  ELSE
    -- Like: Add log and increment count
    INSERT INTO post_likes_log (post_id, client_id) VALUES (p_id, c_id);
    UPDATE posts SET likes = likes + 1 WHERE id = p_id;
    RETURN TRUE; -- Liked = true
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to public (anon)
GRANT SELECT, INSERT, UPDATE ON site_visits TO anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON post_likes_log TO anon, authenticated, service_role;
