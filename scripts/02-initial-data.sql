-- =====================================================
-- DADOS INICIAIS REAIS PARA O SISTEMA
-- =====================================================

-- =====================================================
-- 1. USUÁRIO ADMINISTRADOR
-- =====================================================

-- Inserir usuário admin principal (senha: admin123)
INSERT INTO users (
    email, 
    password_hash, 
    name, 
    role,
    company_name,
    phone,
    tipo_pessoa,
    documento,
    nome_fantasia,
    nome_responsavel,
    cep,
    endereco,
    numero,
    bairro,
    cidade,
    estado
) VALUES (
    'admin@anafood.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Ana Food Administrador',
    'admin',
    'Ana Food Restaurante Ltda',
    '(11) 99999-9999',
    'juridica',
    '12.345.678/0001-99',
    'Ana Food',
    'Ana Silva',
    '01310-100',
    'Avenida Paulista',
    '1000',
    'Bela Vista',
    'São Paulo',
    'SP'
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 2. EMPRESA PRINCIPAL
-- =====================================================

-- Inserir empresa principal
INSERT INTO companies (
    user_id,
    name,
    cnpj,
    phone,
    address,
    email,
    url
) SELECT 
    u.id,
    'Ana Food Restaurante',
    '12.345.678/0001-99',
    '(11) 99999-9999',
    'Avenida Paulista, 1000 - Bela Vista, São Paulo - SP',
    'contato@anafood.com',
    'anafood'
FROM users u 
WHERE u.email = 'admin@anafood.com'
ON CONFLICT (cnpj) DO NOTHING;

-- =====================================================
-- 3. CATEGORIAS DE PRODUTOS
-- =====================================================

INSERT INTO categories (user_id, name, description, on_off)
SELECT 
    u.id,
    category_name,
    category_desc,
    true
FROM users u,
(VALUES 
    ('Hambúrgueres', 'Hambúrgueres artesanais com ingredientes frescos'),
    ('Pizzas', 'Pizzas tradicionais e especiais assadas no forno a lenha'),
    ('Bebidas', 'Bebidas geladas, sucos naturais e refrigerantes'),
    ('Sobremesas', 'Doces caseiros e sobremesas especiais'),
    ('Pratos Executivos', 'Refeições completas para almoço'),
    ('Petiscos', 'Aperitivos e porções para compartilhar')
) AS cat(category_name, category_desc)
WHERE u.email = 'admin@anafood.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. PRODUTOS REAIS
-- =====================================================

INSERT INTO products (user_id, name, category, price, description, active, complements)
SELECT 
    u.id,
    product_name,
    product_category,
    product_price,
    product_desc,
    true,
    product_complements::jsonb
FROM users u,
(VALUES 
    ('X-Burger Clássico', 'Hambúrgueres', 25.90, 'Hambúrguer artesanal 180g, queijo cheddar, alface, tomate, cebola e molho especial', '["Bacon +R$4,00", "Queijo extra +R$3,00", "Cebola caramelizada +R$2,50"]'),
    ('X-Bacon Duplo', 'Hambúrgueres', 32.90, 'Dois hambúrgueres 120g, bacon crocante, queijo cheddar duplo, alface e molho barbecue', '["Ovo +R$2,00", "Batata palha +R$1,50", "Molho extra +R$1,00"]'),
    ('Pizza Margherita', 'Pizzas', 35.00, 'Molho de tomate artesanal, mussarela de búfala, manjericão fresco e azeite extravirgem', '["Borda recheada +R$8,00", "Queijo extra +R$5,00", "Azeitona +R$3,00"]'),
    ('Pizza Portuguesa', 'Pizzas', 42.00, 'Presunto, ovos, cebola, azeitona, mussarela e orégano', '["Borda recheada +R$8,00", "Calabresa +R$6,00"]'),
    ('Coca-Cola 350ml', 'Bebidas', 6.00, 'Refrigerante Coca-Cola gelado', '[]'),
    ('Suco de Laranja Natural', 'Bebidas', 8.50, 'Suco de laranja natural 500ml', '["Com açúcar", "Sem açúcar", "Com gelo"]'),
    ('Pudim de Leite', 'Sobremesas', 12.00, 'Pudim caseiro com calda de caramelo', '["Chantilly +R$2,00"]'),
    ('Prato Executivo - Frango', 'Pratos Executivos', 18.90, 'Filé de frango grelhado, arroz, feijão, batata frita e salada', '["Farofa +R$2,00", "Vinagrete +R$1,50"]'),
    ('Porção de Batata Frita', 'Petiscos', 15.00, 'Batata frita crocante com tempero especial (serve 2 pessoas)', '["Queijo derretido +R$5,00", "Bacon +R$6,00"]'),
    ('Pastel de Queijo', 'Petiscos', 8.00, 'Pastel frito na hora com queijo derretido', '["Catupiry +R$2,00"]')
) AS prod(product_name, product_category, product_price, product_desc, product_complements)
WHERE u.email = 'admin@anafood.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. ADICIONAIS/COMPLEMENTOS
-- =====================================================

INSERT INTO additionals (user_id, name, price, description, on_off)
SELECT 
    u.id,
    additional_name,
    additional_price,
    additional_desc,
    true
FROM users u,
(VALUES 
    ('Bacon Crocante', 4.00, 'Bacon artesanal crocante'),
    ('Queijo Cheddar Extra', 3.00, 'Porção extra de queijo cheddar'),
    ('Cebola Caramelizada', 2.50, 'Cebola caramelizada no açúcar mascavo'),
    ('Ovo Frito', 2.00, 'Ovo frito na chapa'),
    ('Batata Palha', 1.50, 'Batata palha crocante'),
    ('Molho Especial', 1.00, 'Molho da casa'),
    ('Borda Recheada', 8.00, 'Borda recheada com catupiry'),
    ('Azeitona Verde', 3.00, 'Azeitona verde fatiada'),
    ('Chantilly', 2.00, 'Chantilly fresco'),
    ('Farofa Temperada', 2.00, 'Farofa caseira temperada')
) AS add(additional_name, additional_price, additional_desc)
WHERE u.email = 'admin@anafood.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. CLIENTES EXEMPLO
-- =====================================================

INSERT INTO customers (user_id, name, phone, address, email, notes, on_off)
SELECT 
    u.id,
    customer_name,
    customer_phone,
    customer_address,
    customer_email,
    customer_notes,
    true
FROM users u,
(VALUES 
    ('João Silva Santos', '11987654321', 'Rua das Flores, 123 - Jardim Paulista, São Paulo - SP', 'joao.silva@email.com', 'Cliente preferencial - sempre pede sem cebola'),
    ('Maria Oliveira Costa', '11976543210', 'Avenida Brasil, 456 - Vila Madalena, São Paulo - SP', 'maria.oliveira@email.com', 'Vegetariana - não come carne'),
    ('Pedro Henrique Lima', '11965432109', 'Rua Augusta, 789 - Consolação, São Paulo - SP', 'pedro.lima@email.com', 'Sempre pede entrega rápida'),
    ('Ana Carolina Souza', '11954321098', 'Alameda Santos, 321 - Cerqueira César, São Paulo - SP', 'ana.souza@email.com', 'Cliente corporativo - pedidos grandes'),
    ('Carlos Eduardo Rocha', '11943210987', 'Rua Oscar Freire, 654 - Jardins, São Paulo - SP', 'carlos.rocha@email.com', 'Alérgico a amendoim')
) AS cust(customer_name, customer_phone, customer_address, customer_email, customer_notes)
WHERE u.email = 'admin@anafood.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. MÉTODOS DE PAGAMENTO
-- =====================================================

INSERT INTO payment_methods (company_id, user_id, name, active)
SELECT 
    c.id,
    u.id,
    payment_name,
    true
FROM users u
JOIN companies c ON c.user_id = u.id,
(VALUES 
    ('Dinheiro'),
    ('Cartão de Crédito'),
    ('Cartão de Débito'),
    ('PIX'),
    ('Vale Refeição'),
    ('Vale Alimentação')
) AS pay(payment_name)
WHERE u.email = 'admin@anafood.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. LOCAIS DE IMPRESSÃO
-- =====================================================

INSERT INTO print_locations (name, user_id, active)
SELECT 
    location_name,
    u.id,
    true
FROM users u,
(VALUES 
    ('Não imprimir'),
    ('Cozinha Principal'),
    ('Cozinha Fria'),
    ('Bar/Copa'),
    ('Caixa'),
    ('Expedição')
) AS loc(location_name)
WHERE u.email = 'admin@anafood.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. CONFIGURAÇÕES DO SISTEMA
-- =====================================================

-- Catálogo de configurações
INSERT INTO settings_catalog (key, category, data_type, default_value, description) VALUES
('delivery_avg_time', 'timing', 'number', '45', 'Tempo médio de entrega em minutos'),
('pickup_avg_time', 'timing', 'number', '20', 'Tempo médio de retirada em minutos'),
('printer.default_name', 'printer', 'string', '', 'Nome da impressora padrão'),
('printer.show_logo', 'printer', 'boolean', 'true', 'Mostrar logo no cupom'),
('printer.paper_width', 'printer', 'number', '80', 'Largura do papel (55 ou 80mm)'),
('store.is_open', 'store', 'boolean', 'true', 'Loja está aberta'),
('delivery.min_order', 'delivery', 'number', '25.00', 'Valor mínimo para entrega')
ON CONFLICT (key) DO NOTHING;

-- Configurações padrão do sistema
INSERT INTO system_settings (key, value) VALUES
('delivery_avg_time', '45'),
('pickup_avg_time', '20'),
('store_is_open', 'true'),
('delivery_min_order', '25.00'),
('app_name', 'Ana Food'),
('app_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 10. BAIRROS E TAXAS DE ENTREGA
-- =====================================================

INSERT INTO delivery_fees (company_id, user_id, neighborhood, fee, active)
SELECT 
    c.id,
    u.id,
    neighborhood_name,
    delivery_fee,
    true
FROM users u
JOIN companies c ON c.user_id = u.id,
(VALUES 
    ('Bela Vista', 5.00),
    ('Jardins', 6.00),
    ('Vila Madalena', 8.00),
    ('Pinheiros', 8.00),
    ('Consolação', 5.00),
    ('República', 4.00),
    ('Centro', 4.00),
    ('Liberdade', 6.00),
    ('Aclimação', 7.00),
    ('Paraíso', 6.00),
    ('Vila Mariana', 9.00),
    ('Moema', 10.00),
    ('Ibirapuera', 10.00),
    ('Brooklin', 12.00),
    ('Campo Belo', 11.00)
) AS delivery(neighborhood_name, delivery_fee)
WHERE u.email = 'admin@anafood.com'
ON CONFLICT DO NOTHING;
