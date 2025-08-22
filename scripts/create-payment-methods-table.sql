-- Criando tabela para formas de pagamento personalizadas
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(active);

-- RLS (Row Level Security)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Política para isolamento por empresa
CREATE POLICY payment_methods_company_isolation ON payment_methods
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c 
      WHERE c.user_id = auth.uid()
    )
  );

-- Inserir formas de pagamento padrão para empresas existentes
INSERT INTO payment_methods (company_id, user_id, name, active, is_default)
SELECT 
  c.id as company_id,
  c.user_id,
  method_name,
  true as active,
  true as is_default
FROM companies c
CROSS JOIN (
  VALUES 
    ('Dinheiro'),
    ('Cartão de Crédito'),
    ('Cartão de Débito'),
    ('PIX')
) AS default_methods(method_name)
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id 
  AND pm.name = method_name
);
