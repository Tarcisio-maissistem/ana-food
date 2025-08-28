-- Add printer_name column to print_locations table to store Windows printer names
ALTER TABLE print_locations 
ADD COLUMN IF NOT EXISTS printer_name VARCHAR(255) NULL;

-- Add index for better performance on printer_name lookups
CREATE INDEX IF NOT EXISTS idx_print_locations_printer_name 
ON print_locations(printer_name);

-- Insert default print sectors if none exist
INSERT INTO print_locations (name, active, created_at, updated_at)
SELECT name, true, NOW(), NOW()
FROM (VALUES 
  ('Caixa'),
  ('Cozinha'), 
  ('Cozinha 2'),
  ('Bar/Copa'),
  ('Bebidas')
) AS default_sectors(name)
WHERE NOT EXISTS (
  SELECT 1 FROM print_locations WHERE name = default_sectors.name
);
