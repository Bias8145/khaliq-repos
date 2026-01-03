import { createClient } from '@supabase/supabase-js';

// Access environment variables with fallbacks for immediate stability
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zsthvctcsnlrqazfwzma.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdGh2Y3Rjc25scnFhemZ3em1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDE0NTcsImV4cCI6MjA4MjY3NzQ1N30.WWS9JzfFwW6NrCOwSpGNl5KuFqCmCJFISYOQQURp1eI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  is_pinned?: boolean; // Added is_pinned
  status?: 'published' | 'draft';
  view_count: number;
  likes: number;
  author_id: string;
  tags: string[];
  category?: string;
  subcategory?: string;
};
