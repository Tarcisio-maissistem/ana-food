-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image TEXT,
  active BOOLEAN DEFAULT true,
  complements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de impressoras
CREATE TABLE IF NOT EXISTS printers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('USB', 'Rede', 'Bluetooth')),
  model VARCHAR(100) NOT NULL,
  port VARCHAR(50),
  ip VARCHAR(45),
  sector VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'Desconectada' CHECK (status IN ('Conectada', 'Desconectada', 'Erro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_printers_updated_at ON printers;
CREATE TRIGGER update_printers_updated_at
    BEFORE UPDATE ON printers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS para products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON products;
CREATE POLICY "Enable read access for all users" ON products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON products
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON products
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON products
    FOR DELETE USING (true);

-- Políticas RLS para printers
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON printers;
CREATE POLICY "Enable read access for all users" ON printers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON printers
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON printers
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON printers
    FOR DELETE USING (true);

-- Inserir dados de exemplo para produtos
INSERT INTO products (name, category, price, description, active, complements) VALUES
('X-Burger', 'Hambúrgueres', 25.90, 'Hambúrguer artesanal com carne bovina, queijo, alface e tomate', true, '["Bacon", "Queijo extra", "Cebola caramelizada"]'::jsonb),
('Pizza Margherita', 'Pizzas', 35.00, 'Pizza tradicional com molho de tomate, mussarela e manjericão', true, '["Borda recheada", "Queijo extra"]'::jsonb),
('Coca-Cola 2L', 'Bebidas', 12.00, 'Refrigerante Coca-Cola 2 litros', false, '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- Inserir dados de exemplo para impressoras
INSERT INTO printers (name, type, model, port, ip, sector, status) VALUES
('Epson TM-T20', 'USB', 'TM-T20', 'USB001', null, 'Cozinha', 'Conectada'),
('Bematech MP-100S TH', 'Rede', 'MP-100S TH', null, '192.168.1.100', 'Caixa', 'Desconectada'),
('Daruma DR-800', 'USB', 'DR-800', 'USB002', null, 'Bar', 'Conectada')
ON CONFLICT DO NOTHING;
