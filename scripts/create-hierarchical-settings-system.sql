-- Catálogo de configurações para validação e documentação
CREATE TABLE IF NOT EXISTS settings_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
  default_value TEXT,
  description TEXT,
  validation_rules JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações globais do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE REFERENCES settings_catalog(key),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações por empresa (overrides)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES empresas(id),
  key VARCHAR(100) NOT NULL REFERENCES settings_catalog(key),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, key)
);

-- Configurações por usuário (preferências)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  key VARCHAR(100) NOT NULL REFERENCES settings_catalog(key),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Tabela dedicada para impressoras
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES empresas(id),
  name VARCHAR(255) NOT NULL,
  printer_name VARCHAR(255) NOT NULL, -- Nome real da impressora no sistema
  layout JSONB DEFAULT '{}',
  copies INTEGER DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  paper_width INTEGER DEFAULT 80, -- 55mm ou 80mm
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Auditoria de mudanças
CREATE TABLE IF NOT EXISTS settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  key VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configurações padrão no catálogo
INSERT INTO settings_catalog (key, category, data_type, default_value, description) VALUES
('printer.default_name', 'printer', 'string', '', 'Nome da impressora padrão'),
('printer.show_logo', 'printer', 'boolean', 'true', 'Mostrar logo no cupom'),
('printer.show_title', 'printer', 'boolean', 'true', 'Mostrar título no cupom'),
('printer.show_address', 'printer', 'boolean', 'true', 'Mostrar endereço no cupom'),
('printer.show_phone', 'printer', 'boolean', 'true', 'Mostrar telefone no cupom'),
('printer.paper_width', 'printer', 'number', '80', 'Largura do papel (55 ou 80mm)'),
('printer.copies', 'printer', 'number', '1', 'Número de cópias'),
('printer.font_family', 'printer', 'string', 'Courier New', 'Fonte padrão para impressão'),
('printer.encoding', 'printer', 'string', 'UTF-8', 'Codificação de caracteres')
ON CONFLICT (key) DO NOTHING;

-- RLS para segurança multi-tenant
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;

-- Fixed RLS policies to use existing table structure without user_companies
-- Políticas RLS simplificadas para usuários autenticados
CREATE POLICY "Users can access company settings" ON company_settings
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can access their own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can access printers" ON printers
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Função para resolver herança de configurações
CREATE OR REPLACE FUNCTION get_effective_setting(
  p_key VARCHAR(100),
  p_user_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Prioridade: user_settings > company_settings > system_settings > catalog default
  
  -- 1. Verificar user_settings
  IF p_user_id IS NOT NULL THEN
    SELECT value INTO result FROM user_settings 
    WHERE user_id = p_user_id AND key = p_key;
    IF result IS NOT NULL THEN RETURN result; END IF;
  END IF;
  
  -- 2. Verificar company_settings
  IF p_company_id IS NOT NULL THEN
    SELECT value INTO result FROM company_settings 
    WHERE company_id = p_company_id AND key = p_key;
    IF result IS NOT NULL THEN RETURN result; END IF;
  END IF;
  
  -- 3. Verificar system_settings
  SELECT value INTO result FROM system_settings WHERE key = p_key;
  IF result IS NOT NULL THEN RETURN result; END IF;
  
  -- 4. Retornar default do catálogo
  SELECT default_value INTO result FROM settings_catalog WHERE key = p_key;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auditoria
CREATE OR REPLACE FUNCTION audit_settings_changes() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings_audit (table_name, record_id, key, old_value, new_value, changed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.key, OLD.key),
    CASE WHEN TG_OP = 'DELETE' THEN OLD.value ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' THEN NEW.value WHEN TG_OP = 'UPDATE' THEN NEW.value ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de auditoria
CREATE TRIGGER audit_system_settings AFTER INSERT OR UPDATE OR DELETE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();

CREATE TRIGGER audit_company_settings AFTER INSERT OR UPDATE OR DELETE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();

CREATE TRIGGER audit_user_settings AFTER INSERT OR UPDATE OR DELETE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();

CREATE TRIGGER audit_printers AFTER INSERT OR UPDATE OR DELETE ON printers
  FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();
