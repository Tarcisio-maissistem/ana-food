-- Criar tabelas faltantes com controle de status on_off

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de adicionais/complementos
CREATE TABLE IF NOT EXISTS additionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  email VARCHAR(255),
  notes TEXT,
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna on_off às tabelas existentes que não possuem
ALTER TABLE products ADD COLUMN IF NOT EXISTS on_off BOOLEAN DEFAULT true;
ALTER TABLE printers ADD COLUMN IF NOT EXISTS on_off BOOLEAN DEFAULT true;

-- Atualizar registros existentes para ativo por padrão
UPDATE products SET on_off = true WHERE on_off IS NULL;
UPDATE printers SET on_off = true WHERE on_off IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_categories_on_off ON categories(on_off);
CREATE INDEX IF NOT EXISTS idx_additionals_on_off ON additionals(on_off);
CREATE INDEX IF NOT EXISTS idx_customers_on_off ON customers(on_off);
CREATE INDEX IF NOT EXISTS idx_products_on_off ON products(on_off);
CREATE INDEX IF NOT EXISTS idx_printers_on_off ON printers(on_off);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_additionals_updated_at ON additionals;
CREATE TRIGGER update_additionals_updated_at
    BEFORE UPDATE ON additionals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE additionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Políticas para categories
DROP POLICY IF EXISTS "Enable all operations for categories" ON categories;
CREATE POLICY "Enable all operations for categories" ON categories
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para additionals
DROP POLICY IF EXISTS "Enable all operations for additionals" ON additionals;
CREATE POLICY "Enable all operations for additionals" ON additionals
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para customers
DROP POLICY IF EXISTS "Enable all operations for customers" ON customers;
CREATE POLICY "Enable all operations for customers" ON customers
    FOR ALL USING (true) WITH CHECK (true);

-- Inserir dados de exemplo
INSERT INTO categories (name, description, on_off) VALUES
('Hambúrgueres', 'Hambúrgueres artesanais', true),
('Pizzas', 'Pizzas tradicionais e especiais', true),
('Bebidas', 'Bebidas geladas e quentes', true),
('Sobremesas', 'Doces e sobremesas', false)
ON CONFLICT DO NOTHING;

INSERT INTO additionals (name, price, description, on_off) VALUES
('Bacon', 3.50, 'Bacon crocante', true),
('Queijo Extra', 2.00, 'Queijo mussarela extra', true),
('Batata Frita', 8.00, 'Porção de batata frita', true),
('Molho Especial', 1.50, 'Molho da casa', false)
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, phone, address, email, notes, on_off) VALUES
('João Silva', '11999999999', 'Rua das Flores, 123 - Centro', 'joao@email.com', 'Cliente preferencial', true),
('Maria Santos', '11988888888', 'Av. Principal, 456 - Jardim', 'maria@email.com', '', true),
('Pedro Inativo', '11977777777', 'Rua Teste, 789', 'pedro@email.com', 'Cliente desativado', false)
ON CONFLICT DO NOTHING;
