-- Adding missing columns for working hours and automatic acceptance
-- Adiciona colunas para horários de funcionamento e aceite automático na tabela companies

-- Adicionar coluna para horários de funcionamento (JSON)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS horarios JSONB DEFAULT '{
  "segunda": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "terca": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "quarta": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "quinta": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "sexta": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "sabado": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "domingo": {"abertura": "10:00", "fechamento": "14:00", "fechado": true}
}'::jsonb;

-- Adicionar coluna para aceite automático
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS aceite_automatico BOOLEAN DEFAULT false;

-- Atualizar empresas existentes com horários padrão se não tiverem
UPDATE companies 
SET horarios = '{
  "segunda": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "terca": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "quarta": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "quinta": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "sexta": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "sabado": {"abertura": "10:00", "fechamento": "14:00", "fechado": false},
  "domingo": {"abertura": "10:00", "fechamento": "14:00", "fechado": true}
}'::jsonb
WHERE horarios IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN companies.horarios IS 'Horários de funcionamento por dia da semana em formato JSON';
COMMENT ON COLUMN companies.aceite_automatico IS 'Define se pedidos são aceitos automaticamente sem confirmação manual';
