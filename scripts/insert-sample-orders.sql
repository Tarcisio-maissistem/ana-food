-- Inserindo 10 pedidos de exemplo diretamente na tabela orders
-- Sem depender de foreign keys para evitar erros de constraint

INSERT INTO orders (
    id, 
    numero_pedido, 
    status, 
    nome_cliente, 
    telefone, 
    endereco, 
    itens, 
    pagamento, 
    subtotal, 
    taxa_entrega, 
    total, 
    created_at, 
    updated_at
) VALUES 
-- Pedido 1 - Novo
(
    gen_random_uuid(),
    'PED001',
    'novo',
    'João Silva',
    '11987654321',
    'Rua das Flores, 123 - Centro',
    '[{"nome": "Pizza Margherita", "quantidade": 1, "preco": 35.00, "observacoes": "Sem cebola"}]'::jsonb,
    'Dinheiro',
    35.00,
    5.00,
    40.00,
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
),
-- Pedido 2 - Preparando
(
    gen_random_uuid(),
    'PED002',
    'preparando',
    'Maria Santos',
    '11976543210',
    'Av. Paulista, 200 - Bela Vista',
    '[{"nome": "Hambúrguer Artesanal", "quantidade": 2, "preco": 28.00}, {"nome": "Batata Frita", "quantidade": 1, "preco": 12.00}]'::jsonb,
    'Cartão de Crédito',
    68.00,
    8.00,
    76.00,
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes'
),
-- Pedido 3 - Pronto
(
    gen_random_uuid(),
    'PED003',
    'pronto',
    'Pedro Costa',
    '11965432109',
    'Rua Augusta, 300 - Consolação',
    '[{"nome": "Lasanha Bolonhesa", "quantidade": 1, "preco": 42.00}, {"nome": "Refrigerante 2L", "quantidade": 1, "preco": 8.00}]'::jsonb,
    'PIX',
    50.00,
    6.00,
    56.00,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes'
),
-- Pedido 4 - Em Entrega
(
    gen_random_uuid(),
    'PED004',
    'em_entrega',
    'Ana Oliveira',
    '11954321098',
    'Rua Oscar Freire, 400 - Jardins',
    '[{"nome": "Sushi Combo", "quantidade": 1, "preco": 65.00}, {"nome": "Temaki Salmão", "quantidade": 2, "preco": 18.00}]'::jsonb,
    'Cartão de Débito',
    101.00,
    8.00,
    109.00,
    CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes'
),
-- Pedido 5 - Concluído
(
    gen_random_uuid(),
    'PED005',
    'concluido',
    'Carlos Ferreira',
    '11943210987',
    'Av. Faria Lima, 500 - Itaim Bibi',
    '[{"nome": "Açaí 500ml", "quantidade": 1, "preco": 15.00, "observacoes": "Com granola e banana"}]'::jsonb,
    'Dinheiro',
    15.00,
    6.00,
    21.00,
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
),
-- Pedido 6 - Novo
(
    gen_random_uuid(),
    'PED006',
    'novo',
    'Lucia Mendes',
    '11932109876',
    'Rua da Consolação, 600 - Centro',
    '[{"nome": "Pizza Portuguesa", "quantidade": 2, "preco": 38.00}, {"nome": "Pizza Calabresa", "quantidade": 1, "preco": 32.00}]'::jsonb,
    'PIX',
    108.00,
    6.00,
    114.00,
    CURRENT_TIMESTAMP - INTERVAL '20 minutes',
    CURRENT_TIMESTAMP - INTERVAL '20 minutes'
),
-- Pedido 7 - Preparando
(
    gen_random_uuid(),
    'PED007',
    'preparando',
    'Roberto Lima',
    '11921098765',
    'Av. Rebouças, 700 - Pinheiros',
    '[{"nome": "Salada Caesar", "quantidade": 1, "preco": 22.00}, {"nome": "Suco Natural", "quantidade": 1, "preco": 7.00}]'::jsonb,
    'Cartão de Crédito',
    29.00,
    8.00,
    37.00,
    CURRENT_TIMESTAMP - INTERVAL '35 minutes',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes'
),
-- Pedido 8 - Pronto
(
    gen_random_uuid(),
    'PED008',
    'pronto',
    'Fernanda Souza',
    '11910987654',
    'Rua Haddock Lobo, 800 - Cerqueira César',
    '[{"nome": "Espetinho Misto", "quantidade": 5, "preco": 8.00}, {"nome": "Farofa", "quantidade": 1, "preco": 6.00}]'::jsonb,
    'Dinheiro',
    46.00,
    6.00,
    52.00,
    CURRENT_TIMESTAMP - INTERVAL '50 minutes',
    CURRENT_TIMESTAMP - INTERVAL '3 minutes'
),
-- Pedido 9 - Em Entrega
(
    gen_random_uuid(),
    'PED009',
    'em_entrega',
    'Ricardo Alves',
    '11909876543',
    'Av. Ibirapuera, 900 - Moema',
    '[{"nome": "Marmitex Executiva", "quantidade": 1, "preco": 18.00, "observacoes": "Arroz, feijão, bife, batata frita"}]'::jsonb,
    'Cartão de Débito',
    18.00,
    6.00,
    24.00,
    CURRENT_TIMESTAMP - INTERVAL '1 hour 15 minutes',
    CURRENT_TIMESTAMP - INTERVAL '8 minutes'
),
-- Pedido 10 - Concluído
(
    gen_random_uuid(),
    'PED010',
    'concluido',
    'Patrícia Rocha',
    '11898765432',
    'Rua Bela Cintra, 1000 - Consolação',
    '[{"nome": "Combo Família", "quantidade": 1, "preco": 85.00, "observacoes": "2 pizzas grandes + 2 refrigerantes 2L"}]'::jsonb,
    'PIX',
    85.00,
    6.00,
    91.00,
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
);
</sql>
