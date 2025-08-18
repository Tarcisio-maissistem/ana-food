-- Add user_id column to products table for multi-tenant isolation
-- This ensures each user sees only their own products in the SAAS system

-- Add user_id column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add foreign key constraint to reference users table
ALTER TABLE products ADD CONSTRAINT IF NOT EXISTS fk_products_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- Enable Row Level Security (RLS) on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for SELECT - users can only see their own products
CREATE POLICY IF NOT EXISTS "Users can view own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policy for INSERT - users can only create products for themselves
CREATE POLICY IF NOT EXISTS "Users can insert own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policy for UPDATE - users can only update their own products
CREATE POLICY IF NOT EXISTS "Users can update own products" ON products
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policy for DELETE - users can only delete their own products
CREATE POLICY IF NOT EXISTS "Users can delete own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- Update existing products to assign them to a default user (if any exist)
-- This prevents orphaned products when implementing multi-tenant isolation
UPDATE products 
SET user_id = (SELECT id FROM users WHERE email = 'tarcisiorp16@gmail.com' LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id column NOT NULL after assigning existing products
ALTER TABLE products ALTER COLUMN user_id SET NOT NULL;

-- Add some sample products for the user if none exist
INSERT INTO products (name, price, category, description, user_id, on_off) 
SELECT 
  'Hambúrguer Clássico',
  25.90,
  'Hambúrgueres',
  'Hambúrguer com carne, queijo, alface e tomate',
  u.id,
  true
FROM users u 
WHERE u.email = 'tarcisiorp16@gmail.com'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.user_id = u.id)
LIMIT 1;

INSERT INTO products (name, price, category, description, user_id, on_off) 
SELECT 
  'Pizza Margherita',
  35.00,
  'Pizzas',
  'Pizza com molho de tomate, mussarela e manjericão',
  u.id,
  true
FROM users u 
WHERE u.email = 'tarcisiorp16@gmail.com'
AND (SELECT COUNT(*) FROM products p WHERE p.user_id = u.id) < 2
LIMIT 1;
