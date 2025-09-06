-- =====================================================
-- TRIGGERS E ROW LEVEL SECURITY (RLS)
-- =====================================================

-- =====================================================
-- 1. TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Aplicar triggers de updated_at em todas as tabelas relevantes
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_additionals_updated_at 
    BEFORE UPDATE ON additionals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_printers_updated_at 
    BEFORE UPDATE ON printers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TRIGGERS DE AUDITORIA
-- =====================================================

CREATE TRIGGER audit_system_settings 
    AFTER INSERT OR UPDATE OR DELETE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();

CREATE TRIGGER audit_company_settings 
    AFTER INSERT OR UPDATE OR DELETE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();

CREATE TRIGGER audit_user_settings 
    AFTER INSERT OR UPDATE OR DELETE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION audit_settings_changes();

-- =====================================================
-- 3. HABILITAR ROW LEVEL SECURITY
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE additionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_printer_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. POLÍTICAS RLS PARA ISOLAMENTO MULTI-TENANT
-- =====================================================

-- Políticas para users
CREATE POLICY "Users can access their own data" ON users
    FOR ALL USING (auth.uid() = id OR role = 'admin');

-- Políticas para companies
CREATE POLICY "Users can access their companies" ON companies
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para products
CREATE POLICY "Users can access their own products" ON products
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para categories
CREATE POLICY "Users can access their own categories" ON categories
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para customers
CREATE POLICY "Users can access their own customers" ON customers
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para orders
CREATE POLICY "Users can access their own orders" ON orders
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para additionals
CREATE POLICY "Users can access their own additionals" ON additionals
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para printers
CREATE POLICY "Users can access their own printers" ON printers
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para delivery_fees
CREATE POLICY "Users can access their company delivery fees" ON delivery_fees
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para payment_methods
CREATE POLICY "Users can access their company payment methods" ON payment_methods
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para whatsapp_alerts
CREATE POLICY "Users can access their own whatsapp alerts" ON whatsapp_alerts
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para user_settings
CREATE POLICY "Users can access their own settings" ON user_settings
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para company_settings
CREATE POLICY "Users can access company settings" ON company_settings
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas para print_locations
CREATE POLICY "Users can access their print locations" ON print_locations
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Políticas para user_printer_settings
CREATE POLICY "Users can access their printer settings" ON user_printer_settings
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
