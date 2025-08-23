-- Creating comprehensive delivery system tables
-- Create delivery_fees table for neighborhood-based delivery
CREATE TABLE IF NOT EXISTS delivery_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  neighborhood VARCHAR(255) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery_zones table for zone-based delivery
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_name VARCHAR(255) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  polygon_coordinates TEXT, -- JSON string with polygon coordinates
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery_distance_ranges table for distance-based delivery
CREATE TABLE IF NOT EXISTS delivery_distance_ranges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  min_distance DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_distance DECIMAL(5,2) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery_settings table to store which delivery mode is active
CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_mode VARCHAR(50) NOT NULL DEFAULT 'neighborhoods', -- 'neighborhoods', 'distance', 'zones'
  base_location TEXT, -- JSON string with lat/lng for distance-based delivery
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Create payment_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_fees_company_id ON delivery_fees(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_company_id ON delivery_zones(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_distance_ranges_company_id ON delivery_distance_ranges(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_settings_company_id ON delivery_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);

-- Add url column to companies table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'url') THEN
        ALTER TABLE companies ADD COLUMN url VARCHAR(255) UNIQUE;
    END IF;
END $$;

-- Insert default payment methods for existing companies
INSERT INTO payment_methods (company_id, user_id, name, active)
SELECT DISTINCT c.id, c.user_id, 'Dinheiro', true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Dinheiro'
);

INSERT INTO payment_methods (company_id, user_id, name, active)
SELECT DISTINCT c.id, c.user_id, 'Cartão de Crédito', true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cartão de Crédito'
);

INSERT INTO payment_methods (company_id, user_id, name, active)
SELECT DISTINCT c.id, c.user_id, 'Cartão de Débito', true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cartão de Débito'
);

INSERT INTO payment_methods (company_id, user_id, name, active)
SELECT DISTINCT c.id, c.user_id, 'PIX', true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'PIX'
);
