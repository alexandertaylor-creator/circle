-- Add dob and phone to contacts if they don't exist (notes may already exist)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone text;
