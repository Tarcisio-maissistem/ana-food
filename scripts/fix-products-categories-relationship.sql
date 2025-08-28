-- Create script to fix product-category relationship
-- Fix products table to use category_id instead of category text field

-- Add category_id column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Update existing products to link with categories based on category name
-- This will match existing category text with category names in categories table
UPDATE products 
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.name = products.category 
  AND c.user_id = products.user_id
  LIMIT 1
)
WHERE category_id IS NULL 
AND category IS NOT NULL 
AND EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.name = products.category 
  AND c.user_id = products.user_id
);

-- For products without matching categories, create default categories
INSERT INTO categories (name, user_id, on_off, created_at, updated_at)
SELECT DISTINCT 
  products.category as name,
  products.user_id,
  true as on_off,
  NOW() as created_at,
  NOW() as updated_at
FROM products 
WHERE products.category IS NOT NULL 
AND products.category_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.name = products.category 
  AND c.user_id = products.user_id
)
ON CONFLICT DO NOTHING;

-- Update products again after creating missing categories
UPDATE products 
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.name = products.category 
  AND c.user_id = products.user_id
  LIMIT 1
)
WHERE category_id IS NULL 
AND category IS NOT NULL;

-- Add printer sectors table for managing print locations by sector
CREATE TABLE IF NOT EXISTS printer_sectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Add user_id and company_id to printers table if not exists
ALTER TABLE printers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE printers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_printer_sectors_user_id ON printer_sectors(user_id);
CREATE INDEX IF NOT EXISTS idx_printer_sectors_company_id ON printer_sectors(company_id);
CREATE INDEX IF NOT EXISTS idx_printers_user_id ON printers(user_id);
CREATE INDEX IF NOT EXISTS idx_printers_company_id ON printers(company_id);

-- Insert default printer sectors
INSERT INTO printer_sectors (name, user_id, active) 
SELECT 'Caixa', u.id, true FROM users u
WHERE NOT EXISTS (SELECT 1 FROM printer_sectors ps WHERE ps.name = 'Caixa' AND ps.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO printer_sectors (name, user_id, active) 
SELECT 'Cozinha', u.id, true FROM users u
WHERE NOT EXISTS (SELECT 1 FROM printer_sectors ps WHERE ps.name = 'Cozinha' AND ps.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO printer_sectors (name, user_id, active) 
SELECT 'Cozinha 2', u.id, true FROM users u
WHERE NOT EXISTS (SELECT 1 FROM printer_sectors ps WHERE ps.name = 'Cozinha 2' AND ps.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO printer_sectors (name, user_id, active) 
SELECT 'Bar/Copa', u.id, true FROM users u
WHERE NOT EXISTS (SELECT 1 FROM printer_sectors ps WHERE ps.name = 'Bar/Copa' AND ps.user_id = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO printer_sectors (name, user_id, active) 
SELECT 'Bebidas', u.id, true FROM users u
WHERE NOT EXISTS (SELECT 1 FROM printer_sectors ps WHERE ps.name = 'Bebidas' AND ps.user_id = u.id)
ON CONFLICT DO NOTHING;
