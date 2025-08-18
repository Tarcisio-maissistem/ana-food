-- Corrigindo script para usar estrutura correta da tabela system_defaults
-- A tabela system_defaults usa key-value pairs com JSON, não colunas separadas

-- Modificações na tabela user_settings para configurações personalizadas
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_delivery_time INTEGER NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_pickup_time INTEGER NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS auto_accept_orders BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS working_hours JSON;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS delivery_radius DECIMAL(10,2) DEFAULT 5.00;

-- Modificações na tabela users para suporte a empresas
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(10) DEFAULT 'fisica' CHECK (tipo_pessoa IN ('fisica', 'juridica'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf_responsavel VARCHAR(14) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nome_responsavel VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS documento VARCHAR(18) NULL;

-- Índices únicos para evitar duplicatas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_documento') THEN
        ALTER TABLE users ADD CONSTRAINT unique_documento UNIQUE (documento);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_cpf_responsavel') THEN
        ALTER TABLE users ADD CONSTRAINT unique_cpf_responsavel UNIQUE (cpf_responsavel);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_nome_fantasia') THEN
        ALTER TABLE users ADD CONSTRAINT unique_nome_fantasia UNIQUE (nome_fantasia);
    END IF;
END $$;

-- Inserindo configurações de tempo como key-value pairs na estrutura existente
-- Inserir configurações de tempo padrão seguindo o padrão da tabela
INSERT INTO system_defaults (key, value, description, category) VALUES
('delivery_avg_time', '45', 'Tempo médio de entrega em minutos', 'timing'),
('pickup_avg_time', '20', 'Tempo médio de retirada em minutos', 'timing'),
('delivery_time_min', '30', 'Tempo mínimo de entrega em minutos', 'timing'),
('delivery_time_max', '90', 'Tempo máximo de entrega em minutos', 'timing'),
('pickup_time_min', '15', 'Tempo mínimo de retirada em minutos', 'timing'),
('pickup_time_max', '45', 'Tempo máximo de retirada em minutos', 'timing'),
('time_configurations', '{"delivery_avg": 45, "pickup_avg": 20, "delivery_range": {"min": 30, "max": 90}, "pickup_range": {"min": 15, "max": 45}}', 'Configurações completas de tempo', 'timing'),
('store_status', '{"is_open": true, "auto_close": false, "opening_hours": {"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "08:00", "close": "22:00"}}}', 'Status e horários de funcionamento da loja', 'store')
ON CONFLICT (key) DO NOTHING;
