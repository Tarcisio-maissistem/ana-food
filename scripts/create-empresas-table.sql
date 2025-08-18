-- Criar tabela empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    endereco TEXT,
    email VARCHAR(255),
    logo_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índice no CNPJ para melhor performance
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON public.empresas(cnpj);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_empresas_updated_at ON public.empresas;
CREATE TRIGGER update_empresas_updated_at
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para permitir operações
CREATE POLICY "Permitir todas as operações na tabela empresas" ON public.empresas
    FOR ALL USING (true) WITH CHECK (true);

-- Inserir empresa de exemplo para teste
INSERT INTO public.empresas (nome, cnpj, telefone, endereco, email) 
VALUES (
    'Ana Food Restaurante',
    '12.345.678/0001-99',
    '(11) 99999-9999',
    'Rua das Flores, 123 - Centro',
    'contato@anafood.com'
) ON CONFLICT (cnpj) DO NOTHING;
