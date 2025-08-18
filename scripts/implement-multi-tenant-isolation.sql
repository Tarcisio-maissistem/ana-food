-- Script para implementar isolamento completo multi-tenant (SAAS)
-- Adiciona user_id a todas as tabelas relevantes e implementa RLS

-- 1. Adicionar user_id às tabelas que precisam de isolamento
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE additionals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE printers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_additionals_user_id ON additionals(user_id);
CREATE INDEX IF NOT EXISTS idx_printers_user_id ON printers(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_alerts_user_id ON whatsapp_alerts(user_id);

-- 3. Atualizar dados existentes para associar a um usuário padrão (primeiro usuário admin)
DO $$
DECLARE
    default_user_id UUID;
BEGIN
    -- Buscar o primeiro usuário admin como padrão
    SELECT id INTO default_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF default_user_id IS NOT NULL THEN
        -- Atualizar registros existentes sem user_id
        UPDATE products SET user_id = default_user_id WHERE user_id IS NULL;
        UPDATE categories SET user_id = default_user_id WHERE user_id IS NULL;
        UPDATE customers SET user_id = default_user_id WHERE user_id IS NULL;
        UPDATE additionals SET user_id = default_user_id WHERE user_id IS NULL;
        UPDATE printers SET user_id = default_user_id WHERE user_id IS NULL;
        UPDATE whatsapp_alerts SET user_id = default_user_id WHERE user_id IS NULL;
    END IF;
END $$;

-- 4. Tornar user_id obrigatório após associar dados existentes
ALTER TABLE products ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE additionals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE printers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE whatsapp_alerts ALTER COLUMN user_id SET NOT NULL;

-- 5. Remover políticas RLS antigas e criar novas com isolamento por usuário

-- Products
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON products;
DROP POLICY IF EXISTS "Enable all operations for products" ON products;

CREATE POLICY "Users can only access their own products" ON products
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Categories
DROP POLICY IF EXISTS "Enable all operations for categories" ON categories;

CREATE POLICY "Users can only access their own categories" ON categories
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Customers
DROP POLICY IF EXISTS "Enable all operations for customers" ON customers;

CREATE POLICY "Users can only access their own customers" ON customers
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Additionals
DROP POLICY IF EXISTS "Enable all operations for additionals" ON additionals;

CREATE POLICY "Users can only access their own additionals" ON additionals
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Printers
DROP POLICY IF EXISTS "Enable read access for all users" ON printers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON printers;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON printers;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON printers;

CREATE POLICY "Users can only access their own printers" ON printers
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- WhatsApp Alerts
CREATE POLICY "Users can only access their own whatsapp alerts" ON whatsapp_alerts
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. Atualizar política de user_settings para melhor isolamento
DROP POLICY IF EXISTS "Usuários podem ler suas configurações" ON user_settings;
DROP POLICY IF EXISTS "Usuários podem inserir suas configurações" ON user_settings;
DROP POLICY IF EXISTS "Usuários podem atualizar suas configurações" ON user_settings;
DROP POLICY IF EXISTS "Usuários podem deletar suas configurações" ON user_settings;

CREATE POLICY "Users can only access their own settings" ON user_settings
    FOR ALL USING (user_id::uuid = auth.uid()) WITH CHECK (user_id::uuid = auth.uid());

-- 7. Garantir que todas as tabelas tenham RLS habilitado
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE additionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 8. Criar função helper para verificar se usuário é proprietário dos dados
CREATE OR REPLACE FUNCTION is_owner(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN resource_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Comentários para documentação
COMMENT ON COLUMN products.user_id IS 'ID do usuário proprietário do produto (isolamento multi-tenant)';
COMMENT ON COLUMN categories.user_id IS 'ID do usuário proprietário da categoria (isolamento multi-tenant)';
COMMENT ON COLUMN customers.user_id IS 'ID do usuário proprietário do cliente (isolamento multi-tenant)';
COMMENT ON COLUMN additionals.user_id IS 'ID do usuário proprietário do adicional (isolamento multi-tenant)';
COMMENT ON COLUMN printers.user_id IS 'ID do usuário proprietário da impressora (isolamento multi-tenant)';
COMMENT ON COLUMN whatsapp_alerts.user_id IS 'ID do usuário proprietário do alerta (isolamento multi-tenant)';
