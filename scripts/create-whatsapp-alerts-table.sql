-- Criando tabela para alertas WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir alguns alertas de exemplo
INSERT INTO whatsapp_alerts (customer_name, phone, message, is_read) VALUES
('João Silva', '11987654321', 'Olá, gostaria de saber sobre meu pedido', FALSE),
('Maria Santos', '11976543210', 'Meu pedido está atrasado?', FALSE),
('Pedro Costa', '11965432109', 'Posso alterar o endereço de entrega?', FALSE);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_alerts_is_read ON whatsapp_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_whatsapp_alerts_created_at ON whatsapp_alerts(created_at);
