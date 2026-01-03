/*
  # Add Pinned Column
  Adds is_pinned column to posts table to allow featuring specific posts.

  ## Query Description:
  1. Adds is_pinned boolean column with default false
  2. Safe operation, non-destructive

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
*/

ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
