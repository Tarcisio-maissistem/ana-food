-- Criar tabelas de configurações do sistema
-- Este script cria as tabelas necessárias para o sistema de configurações personalizáveis

-- Tabela de configurações padrão do sistema
CREATE TABLE IF NOT EXISTS public.system_defaults (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações personalizadas por usuário
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_system_defaults_key ON public.system_defaults(key);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON public.user_settings(user_id, key);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_system_defaults_updated_at ON public.system_defaults;
CREATE TRIGGER update_system_defaults_updated_at
    BEFORE UPDATE ON public.system_defaults
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão do sistema
INSERT INTO public.system_defaults (key, value, description, category) VALUES
('theme', '"light"', 'Tema padrão da interface', 'appearance'),
('auto_accept_orders', 'false', 'Aceitar pedidos automaticamente', 'orders'),
('sound_notifications', 'true', 'Habilitar notificações sonoras', 'notifications'),
('inactivity_alert_minutes', '30', 'Minutos para alerta de inatividade', 'alerts'),
('default_order_filter', '"todos"', 'Filtro padrão de pedidos', 'orders'),
('whatsapp_auto_notifications', 'true', 'Notificações automáticas WhatsApp', 'whatsapp'),
('order_status_colors', '{"novo": "#3b82f6", "preparando": "#f59e0b", "pronto": "#10b981", "entregue": "#6b7280"}', 'Cores dos status de pedidos', 'appearance'),
('notification_messages', '{"novo": "Novo pedido recebido!", "preparando": "Pedido em preparo", "pronto": "Pedido pronto para entrega", "entregue": "Pedido entregue"}', 'Mensagens de notificação por status', 'notifications')
ON CONFLICT (key) DO NOTHING;

-- Políticas RLS (Row Level Security)
ALTER TABLE public.system_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Política para system_defaults (todos podem ler, apenas admin pode escrever)
CREATE POLICY "Todos podem ler configurações padrão" ON public.system_defaults
    FOR SELECT USING (true);

CREATE POLICY "Apenas admin pode modificar configurações padrão" ON public.system_defaults
    FOR ALL USING (auth.role() = 'service_role');

-- Política para user_settings (usuários podem gerenciar suas próprias configurações)
CREATE POLICY "Usuários podem ler suas configurações" ON public.user_settings
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem inserir suas configurações" ON public.user_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas configurações" ON public.user_settings
    FOR UPDATE USING (true);

CREATE POLICY "Usuários podem deletar suas configurações" ON public.user_settings
    FOR DELETE USING (true);

-- Comentários nas tabelas
COMMENT ON TABLE public.system_defaults IS 'Configurações padrão do sistema';
COMMENT ON TABLE public.user_settings IS 'Configurações personalizadas por usuário';
