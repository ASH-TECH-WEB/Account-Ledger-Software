-- Add password column to user_settings table
-- This fixes the "Could not find the 'password' column" error

-- Add password column
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Update existing records to have empty password
UPDATE user_settings 
SET password = '' 
WHERE password IS NULL;

-- Make password column NOT NULL with default empty string
ALTER TABLE user_settings 
ALTER COLUMN password SET NOT NULL,
ALTER COLUMN password SET DEFAULT '';

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name = 'password';

-- Show updated table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
ORDER BY ordinal_position;
