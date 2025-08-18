-- Criar apenas a tabela additionals que está faltando
CREATE TABLE IF NOT EXISTS additionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_additionals_on_off ON additionals(on_off);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_additionals_updated_at ON additionals;
CREATE TRIGGER update_additionals_updated_at
    BEFORE UPDATE ON additionals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS temporárias (serão atualizadas pelo script de isolamento)
ALTER TABLE additionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for additionals" ON additionals;
CREATE POLICY "Enable all operations for additionals" ON additionals
    FOR ALL USING (true) WITH CHECK (true);

-- Inserir dados de exemplo
INSERT INTO additionals (name, price, description, on_off) VALUES
('Bacon', 3.50, 'Bacon crocante', true),
('Queijo Extra', 2.00, 'Queijo mussarela extra', true),
('Batata Frita', 8.00, 'Porção de batata frita', true),
('Molho Especial', 1.50, 'Molho da casa', true)
ON CONFLICT DO NOTHING;
