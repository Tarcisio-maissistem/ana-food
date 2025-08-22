-- Criar tabela de formas de pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);

-- Inserir formas de pagamento padrão para empresas existentes
INSERT INTO payment_methods (name, description, company_id, user_id)
SELECT 
  'Dinheiro' as name,
  'Pagamento em dinheiro' as description,
  c.id as company_id,
  c.user_id
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Dinheiro'
);

INSERT INTO payment_methods (name, description, company_id, user_id)
SELECT 
  'Cartão de Crédito' as name,
  'Pagamento com cartão de crédito' as description,
  c.id as company_id,
  c.user_id
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cartão de Crédito'
);

INSERT INTO payment_methods (name, description, company_id, user_id)
SELECT 
  'Cartão de Débito' as name,
  'Pagamento com cartão de débito' as description,
  c.id as company_id,
  c.user_id
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cartão de Débito'
);

INSERT INTO payment_methods (name, description, company_id, user_id)
SELECT 
  'PIX' as name,
  'Pagamento via PIX' as description,
  c.id as company_id,
  c.user_id
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'PIX'
);
