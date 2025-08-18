-- Adicionar campo user_id na tabela companies para isolamento multi-tenant
ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- Habilitar RLS na tabela companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários só podem ver suas próprias empresas
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
CREATE POLICY "Users can view own companies" ON companies
    FOR SELECT USING (auth.uid() = user_id);

-- Política para INSERT: usuários só podem criar empresas para si mesmos
DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
CREATE POLICY "Users can insert own companies" ON companies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: usuários só podem atualizar suas próprias empresas
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
CREATE POLICY "Users can update own companies" ON companies
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para DELETE: usuários só podem deletar suas próprias empresas
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;
CREATE POLICY "Users can delete own companies" ON companies
    FOR DELETE USING (auth.uid() = user_id);

-- Atualizar registros existentes para associar a um usuário padrão (se houver)
-- Comentado para evitar problemas - deve ser executado manualmente se necessário
-- UPDATE companies SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
