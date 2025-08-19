-- Criando sistema completo de locais de impressão
-- Criar tabela de locais de impressão
CREATE TABLE IF NOT EXISTS print_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_print_locations_user_id ON print_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_print_locations_active ON print_locations(active);

-- Adicionar colunas necessárias nas tabelas existentes
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS print_location_id UUID REFERENCES print_locations(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS print_location_id UUID REFERENCES print_locations(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE additionals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_print_location ON products(print_location_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_print_location ON categories(print_location_id);
CREATE INDEX IF NOT EXISTS idx_additionals_user_id ON additionals(user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE print_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE additionals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para print_locations
CREATE POLICY "Users can view own print_locations" ON print_locations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own print_locations" ON print_locations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own print_locations" ON print_locations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own print_locations" ON print_locations FOR DELETE USING (user_id = auth.uid());

-- Políticas RLS para products
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

CREATE POLICY "Users can view own products" ON products FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (user_id = auth.uid());

-- Políticas RLS para categories
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (user_id = auth.uid());

-- Políticas RLS para additionals
DROP POLICY IF EXISTS "Users can view own additionals" ON additionals;
DROP POLICY IF EXISTS "Users can insert own additionals" ON additionals;
DROP POLICY IF EXISTS "Users can update own additionals" ON additionals;
DROP POLICY IF EXISTS "Users can delete own additionals" ON additionals;

CREATE POLICY "Users can view own additionals" ON additionals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own additionals" ON additionals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own additionals" ON additionals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own additionals" ON additionals FOR DELETE USING (user_id = auth.uid());

-- Inserir locais de impressão padrão para o usuário específico (tarcisiorp16@gmail.com)
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Buscar o ID do usuário
    SELECT id INTO target_user_id FROM users WHERE email = 'tarcisiorp16@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Inserir locais de impressão padrão
        INSERT INTO print_locations (name, user_id) VALUES
        ('Não imprimir', target_user_id),
        ('Cozinha', target_user_id),
        ('Bar/Copa', target_user_id),
        ('Caixa', target_user_id)
        ON CONFLICT DO NOTHING;
        
        -- Atualizar produtos existentes para associar ao usuário
        UPDATE products SET user_id = target_user_id WHERE user_id IS NULL;
        
        -- Atualizar categorias existentes para associar ao usuário
        UPDATE categories SET user_id = target_user_id WHERE user_id IS NULL;
        
        -- Atualizar adicionais existentes para associar ao usuário
        UPDATE additionals SET user_id = target_user_id WHERE user_id IS NULL;
    END IF;
END $$;
