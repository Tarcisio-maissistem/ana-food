-- Create tables for printer settings and layout configurations

-- Tabela para configurações de impressora por usuário
CREATE TABLE IF NOT EXISTS user_printer_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cnpj TEXT,
    printer_name TEXT NOT NULL,
    print_settings JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para garantir apenas uma impressora padrão por usuário/CNPJ
    UNIQUE(user_id, cnpj, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Tabela para layouts de impressão personalizados
CREATE TABLE IF NOT EXISTS printer_layouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cnpj TEXT,
    layout_name TEXT NOT NULL,
    layout_config JSONB NOT NULL DEFAULT '{}',
    paper_width INTEGER DEFAULT 80, -- 55mm ou 80mm
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para garantir apenas um layout padrão por usuário/CNPJ
    UNIQUE(user_id, cnpj, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_printer_settings_user_cnpj ON user_printer_settings(user_id, cnpj);
CREATE INDEX IF NOT EXISTS idx_printer_layouts_user_cnpj ON printer_layouts(user_id, cnpj);

-- RLS (Row Level Security) para garantir que usuários só vejam seus próprios dados
ALTER TABLE user_printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_layouts ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para user_printer_settings
CREATE POLICY "Users can view their own printer settings" ON user_printer_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own printer settings" ON user_printer_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own printer settings" ON user_printer_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own printer settings" ON user_printer_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas de segurança para printer_layouts
CREATE POLICY "Users can view their own printer layouts" ON printer_layouts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own printer layouts" ON printer_layouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own printer layouts" ON printer_layouts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own printer layouts" ON printer_layouts
    FOR DELETE USING (auth.uid() = user_id);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar automaticamente o updated_at
CREATE TRIGGER update_user_printer_settings_updated_at 
    BEFORE UPDATE ON user_printer_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_printer_layouts_updated_at 
    BEFORE UPDATE ON printer_layouts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo (opcional)
-- INSERT INTO user_printer_settings (user_id, cnpj, printer_name, print_settings, is_default)
-- VALUES (
--     auth.uid(),
--     '12345678000199',
--     'Microsoft Print to PDF',
--     '{"showLogo": true, "showTitle": true, "showAddress": true, "showPhone": true}',
--     true
-- );
