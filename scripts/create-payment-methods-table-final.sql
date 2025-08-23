-- Creating payment_methods table with default payment methods
-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(active);

-- Insert default payment methods for all existing companies
INSERT INTO payment_methods (name, active, company_id, user_id)
SELECT 
  'Dinheiro' as name,
  true as active,
  c.id as company_id,
  c.user_id as user_id
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Dinheiro'
);

INSERT INTO payment_methods (name, active, company_id, user_id)
SELECT 
  'Cartão de Crédito' as name,
  true as active,
  c.id as company_id,
  c.user_id as user_id
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cartão de Crédito'
);

INSERT INTO payment_methods (name, active, company_id, user_id)
SELECT 
  'Cartão de Débito' as name,
  true as active,
  c.id as company_id,
  c.user_id as user_id
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cartão de Débito'
);

INSERT INTO payment_methods (name, active, company_id, user_id)
SELECT 
  'PIX' as name,
  true as active,
  c.id as company_id,
  c.user_id as user_id
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'PIX'
);

-- Enable RLS (Row Level Security)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for payment_methods
CREATE POLICY "Users can only access their company's payment methods" ON payment_methods
  FOR ALL USING (company_id IN (
    SELECT c.id FROM companies c 
    WHERE c.user_id = auth.uid()
  ));
