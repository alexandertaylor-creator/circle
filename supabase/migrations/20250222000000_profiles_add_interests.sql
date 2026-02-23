-- Add interests array to profiles (shared when someone adds you to their circle)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
