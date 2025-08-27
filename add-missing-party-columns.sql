-- Migration: Add missing columns to parties table
-- Run this in your Supabase SQL editor to update existing database

-- Add missing columns with default values
ALTER TABLE parties 
ADD COLUMN IF NOT EXISTS status VARCHAR(10) DEFAULT 'R',
ADD COLUMN IF NOT EXISTS commi_system VARCHAR(20) DEFAULT 'Take',
ADD COLUMN IF NOT EXISTS balance_limit VARCHAR(50) DEFAULT '0',
ADD COLUMN IF NOT EXISTS m_commission VARCHAR(50) DEFAULT 'No Commission',
ADD COLUMN IF NOT EXISTS rate VARCHAR(50) DEFAULT '0',
ADD COLUMN IF NOT EXISTS monday_final VARCHAR(10) DEFAULT 'No';

-- Update existing records to have default values
UPDATE parties 
SET 
  status = COALESCE(status, 'R'),
  commi_system = COALESCE(commi_system, 'Take'),
  balance_limit = COALESCE(balance_limit, '0'),
  m_commission = COALESCE(m_commission, 'No Commission'),
  rate = COALESCE(rate, '0'),
  monday_final = COALESCE(monday_final, 'No')
WHERE 
  status IS NULL 
  OR commi_system IS NULL 
  OR balance_limit IS NULL 
  OR m_commission IS NULL 
  OR rate IS NULL 
  OR monday_final IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'parties' 
ORDER BY ordinal_position;
