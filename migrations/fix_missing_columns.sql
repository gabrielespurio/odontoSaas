-- Add username column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

-- Update existing users to have username based on email if username is null
UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL;

-- Make username NOT NULL after setting values
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Add company_id to procedures table if it doesn't exist
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);