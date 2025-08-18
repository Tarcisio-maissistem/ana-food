-- Criar tabelas para sistema de configurações de usuário
CREATE TABLE IF NOT EXISTS system_defaults (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, key)
);

-- Inserir configurações padrão do sistema
INSERT INTO system_defaults (key, value) VALUES
('auto_accept', '{"enabled": false}'),
('sound_enabled', '{"enabled": true}'),
('visible_columns', '{"novo": true, "preparando": true, "pronto": true, "em_entrega": true, "concluido": true, "cancelado": false}'),
('inactivity_alert', '{"minutes": 30}'),
('default_filter', '{"status": ["novo", "preparando"]}'),
('notification_settings', '{"new_order": true, "order_ready": true, "order_delayed": true}'),
('theme_settings', '{"mode": "light", "color": "blue"}'),
('printer_settings', '{"auto_print": false, "copies": 1}'),
('order_display', '{"show_customer_info": true, "show_payment_method": true, "show_address": true}')
ON CONFLICT (key) DO NOTHING;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_defaults_updated_at 
    BEFORE UPDATE ON system_defaults 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
