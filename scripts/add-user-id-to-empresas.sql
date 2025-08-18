-- Adicionar campo user_id na tabela empresas para associar empresa ao usuário
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Criar índice para melhor performance nas consultas por usuário
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON public.empresas(user_id);

-- Atualizar política RLS para filtrar empresas por usuário
DROP POLICY IF EXISTS "Permitir todas as operações na tabela empresas" ON public.empresas;

-- Criar política RLS para isolamento por usuário
CREATE POLICY "Usuários podem ver apenas suas próprias empresas" ON public.empresas
    FOR ALL USING (auth.uid() = user_id);

-- Permitir inserção para usuários autenticados
CREATE POLICY "Usuários podem criar suas próprias empresas" ON public.empresas
    FOR INSERT WITH CHECK (auth.uid() = user_id);
