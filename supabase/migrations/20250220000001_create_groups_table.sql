-- Groups table for group metadata (e.g. photo_url)
CREATE TABLE IF NOT EXISTS groups (
  name text PRIMARY KEY,
  photo_url text
);
