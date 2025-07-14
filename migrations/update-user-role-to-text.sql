-- Migration to change user role from enum to text to support custom profiles
-- This migration allows users to have custom profile names instead of fixed roles

-- First, alter the column type from enum to text
ALTER TABLE users ALTER COLUMN role TYPE text;

-- Drop the old enum since we're not using it anymore
-- (Keep it commented out in case we need to rollback)
-- DROP TYPE user_role;

-- Update any existing roles to maintain compatibility
-- This ensures existing users continue to work
UPDATE users SET role = 'admin' WHERE role = 'admin';
UPDATE users SET role = 'dentist' WHERE role = 'dentist';
UPDATE users SET role = 'reception' WHERE role = 'reception';