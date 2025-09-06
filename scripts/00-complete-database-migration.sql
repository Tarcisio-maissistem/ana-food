-- =====================================================
-- MIGRAÇÃO COMPLETA DO BANCO DE DADOS SUPABASE
-- Sistema de Delivery/Restaurante Ana Food
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de usuários (base do sistema)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  active BOOLEAN DEFAULT true,
  
  -- Campos para empresas/restaurantes
  company_name VARCHAR(255),
  phone VARCHAR(20),
  tipo_pessoa VARCHAR(10) DEFAULT 'juridica' CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  documento VARCHAR(18), -- CPF ou CNPJ
  nome_fantasia VARCHAR(255),
  nome_responsavel VARCHAR(255),
  
  -- Endereço completo
  cep VARCHAR(9),
  endereco VARCHAR(500),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de empresas/restaurantes
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  email VARCHAR(255),
  logo_url TEXT,
  url VARCHAR(255) UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. SISTEMA DE PRODUTOS E CATEGORIAS
-- =====================================================

-- Categorias de produtos
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  print_location_id UUID,
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image TEXT,
  print_location_id UUID,
  active BOOLEAN DEFAULT true,
  on_off BOOLEAN DEFAULT true,
  complements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionais/Complementos
CREATE TABLE IF NOT EXISTS additionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. SISTEMA DE CLIENTES E PEDIDOS
-- =====================================================

-- Clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  email VARCHAR(255),
  notes TEXT,
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  delivery_time TIMESTAMP WITH TIME ZONE,
  cnpj VARCHAR(18),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. SISTEMA DE DELIVERY
-- =====================================================

-- Taxas de entrega por bairro
CREATE TABLE IF NOT EXISTS delivery_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  neighborhood VARCHAR(255) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zonas de entrega
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_name VARCHAR(255) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  polygon_coordinates TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações de delivery
CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_mode VARCHAR(50) NOT NULL DEFAULT 'neighborhoods',
  base_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- =====================================================
-- 5. SISTEMA DE PAGAMENTO
-- =====================================================

-- Métodos de pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. SISTEMA DE IMPRESSÃO
-- =====================================================

-- Locais de impressão
CREATE TABLE IF NOT EXISTS print_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Impressoras
CREATE TABLE IF NOT EXISTS printers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('USB', 'Rede', 'Bluetooth')),
  model VARCHAR(100) NOT NULL,
  port VARCHAR(50),
  ip VARCHAR(45),
  sector VARCHAR(100) NOT NULL,
  printer_name VARCHAR(255) NOT NULL,
  layout JSONB DEFAULT '{}',
  copies INTEGER DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  paper_width INTEGER DEFAULT 80,
  status VARCHAR(50) DEFAULT 'Desconectada',
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações de impressora por usuário
CREATE TABLE IF NOT EXISTS user_printer_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cnpj TEXT,
  printer_name TEXT NOT NULL,
  print_settings JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. SISTEMA DE CONFIGURAÇÕES HIERÁRQUICO
-- =====================================================

-- Catálogo de configurações
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

-- Configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key)
);

-- Configurações por empresa
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, key)
);

-- Configurações por usuário
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  custom_delivery_time INTEGER,
  custom_pickup_time INTEGER,
  auto_accept_orders BOOLEAN DEFAULT FALSE,
  working_hours JSON,
  delivery_radius DECIMAL(10,2) DEFAULT 5.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- =====================================================
-- 8. SISTEMA DE AUDITORIA
-- =====================================================

-- Logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  action_type VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  request_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auditoria de configurações
CREATE TABLE IF NOT EXISTS settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  key VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. SISTEMA DE ALERTAS WHATSAPP
-- =====================================================

-- Alertas WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices principais
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_documento ON users(documento);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_fees_company_id ON delivery_fees(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_alerts_user_id ON whatsapp_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_alerts_is_read ON whatsapp_alerts(is_read);

-- =====================================================
-- 11. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função para resolver configurações hierárquicas
CREATE OR REPLACE FUNCTION get_effective_setting(
  p_key VARCHAR(100),
  p_user_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Prioridade: user_settings > company_settings > system_settings > catalog default
  
  IF p_user_id IS NOT NULL THEN
    SELECT value INTO result FROM user_settings 
    WHERE user_id = p_user_id AND key = p_key;
    IF result IS NOT NULL THEN RETURN result; END IF;
  END IF;
  
  IF p_company_id IS NOT NULL THEN
    SELECT value INTO result FROM company_settings 
    WHERE company_id = p_company_id AND key = p_key;
    IF result IS NOT NULL THEN RETURN result; END IF;
  END IF;
  
  SELECT value INTO result FROM system_settings WHERE key = p_key;
  IF result IS NOT NULL THEN RETURN result; END IF;
  
  SELECT default_value INTO result FROM settings_catalog WHERE key = p_key;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para auditoria
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
