-- Adicionar isolamento de usuário à tabela orders
-- Cada pedido deve pertencer a um usuário específico

-- Adicionar coluna user_id à tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Criar índice para melhor performance nas consultas por usuário
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Atualizar pedidos existentes para associar ao primeiro usuário (temporário)
-- Em produção, isso deve ser feito com mais cuidado
UPDATE orders 
SET user_id = (SELECT id FROM users LIMIT 1)
WHERE user_id IS NULL;

-- Tornar user_id obrigatório após atualizar dados existentes
ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;

-- Habilitar RLS (Row Level Security) na tabela orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para que usuários vejam apenas seus próprios pedidos
CREATE POLICY orders_user_isolation ON orders
  FOR ALL
  USING (user_id::text = auth.uid()::text);

-- Permitir inserção apenas com user_id do usuário autenticado
CREATE POLICY orders_insert_policy ON orders
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);
