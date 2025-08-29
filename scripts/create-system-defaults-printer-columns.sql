-- Add printer configuration columns to system_defaults table if needed
-- This script adds columns for printer settings to system_defaults table

-- Check if system_defaults table exists, if not create it
CREATE TABLE IF NOT EXISTS system_defaults (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, key)
);

-- Add printer configuration columns if they don't exist
DO $$ 
BEGIN
  -- Add default_printer column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'system_defaults' AND column_name = 'default_printer') THEN
    ALTER TABLE system_defaults ADD COLUMN default_printer VARCHAR(255);
  END IF;

  -- Add printer_layout column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'system_defaults' AND column_name = 'printer_layout') THEN
    ALTER TABLE system_defaults ADD COLUMN printer_layout JSONB;
  END IF;

  -- Add print_settings column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'system_defaults' AND column_name = 'print_settings') THEN
    ALTER TABLE system_defaults ADD COLUMN print_settings JSONB DEFAULT '{"showLogo": true, "showTitle": true, "showAddress": true, "showPhone": true}';
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_system_defaults_company_key ON system_defaults(company_id, key);

-- Enable RLS
ALTER TABLE system_defaults ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their company system defaults" ON system_defaults
  FOR SELECT USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN users u ON u.id = auth.uid()
      WHERE c.cnpj = u.cnpj
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert their company system defaults" ON system_defaults
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN users u ON u.id = auth.uid()
      WHERE c.cnpj = u.cnpj
    )
  );

CREATE POLICY IF NOT EXISTS "Users can update their company system defaults" ON system_defaults
  FOR UPDATE USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN users u ON u.id = auth.uid()
      WHERE c.cnpj = u.cnpj
    )
  );
