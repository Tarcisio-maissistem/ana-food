-- Add CNPJ column to orders table for multi-tenant realtime subscriptions
-- This enables filtering orders by company CNPJ in Supabase Realtime

-- Add CNPJ column to orders table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cnpj') THEN
        ALTER TABLE orders ADD COLUMN cnpj VARCHAR(14);
        CREATE INDEX IF NOT EXISTS idx_orders_cnpj ON orders(cnpj);
        
        -- Update existing orders with CNPJ from companies table
        UPDATE orders 
        SET cnpj = companies.cnpj 
        FROM companies 
        WHERE orders.user_id = companies.user_id 
        AND orders.cnpj IS NULL;
        
        COMMENT ON COLUMN orders.cnpj IS 'Company CNPJ for multi-tenant realtime filtering';
    END IF;
END $$;

-- Create or replace function to automatically set CNPJ on new orders
CREATE OR REPLACE FUNCTION set_order_cnpj()
RETURNS TRIGGER AS $$
BEGIN
    -- Get CNPJ from companies table based on user_id
    SELECT cnpj INTO NEW.cnpj 
    FROM companies 
    WHERE user_id = NEW.user_id 
    LIMIT 1;
    
    -- If no CNPJ found, try to get from current user context
    IF NEW.cnpj IS NULL THEN
        NEW.cnpj := '12345678000199'; -- Default CNPJ for development
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set CNPJ on INSERT
DROP TRIGGER IF EXISTS trigger_set_order_cnpj ON orders;
CREATE TRIGGER trigger_set_order_cnpj
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_cnpj();

-- Enable Row Level Security for orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for orders based on CNPJ
DROP POLICY IF EXISTS "orders_cnpj_policy" ON orders;
CREATE POLICY "orders_cnpj_policy" ON orders
    FOR ALL USING (
        cnpj IN (
            SELECT companies.cnpj 
            FROM companies 
            WHERE companies.user_id = auth.uid()
        )
    );

-- Grant necessary permissions for realtime
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
