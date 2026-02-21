-- Add user_id to groups for per-user group metadata (e.g. photo_url per user)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE groups SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
ALTER TABLE groups ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_pkey;
ALTER TABLE groups ADD PRIMARY KEY (user_id, name);
