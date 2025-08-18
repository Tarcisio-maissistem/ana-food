-- Corrigir estrutura da tabela users para suportar o sistema de cadastro completo
-- Adicionar colunas faltantes que estão sendo referenciadas no código

-- Adicionar colunas básicas faltantes
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Adicionar campos específicos para empresas/restaurantes
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(10) DEFAULT 'juridica' CHECK (tipo_pessoa IN ('fisica', 'juridica'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS documento VARCHAR(18); -- CPF ou CNPJ
ALTER TABLE users ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nome_responsavel VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
ALTER TABLE users ADD COLUMN IF NOT EXISTS endereco VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS numero VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- Criar índices únicos para evitar duplicatas conforme requisitos
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_documento ON users(documento) WHERE documento IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nome_fantasia ON users(nome_fantasia) WHERE nome_fantasia IS NOT NULL;

-- Corrigir política RLS removendo casting desnecessário de UUID para text
-- Atualizar políticas RLS para incluir novos campos
DROP POLICY IF EXISTS users_policy ON users;
CREATE POLICY users_policy ON users
  FOR ALL
  USING (auth.uid() = id OR role = 'admin');
