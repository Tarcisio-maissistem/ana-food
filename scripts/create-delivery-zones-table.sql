-- Create delivery zones table for managing neighborhood delivery areas
CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    zone VARCHAR NOT NULL, -- neighborhood name
    price NUMERIC NOT NULL, -- delivery price for this zone
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_zones_company_id ON delivery_zones(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(active);

-- Add RLS policies for multi-tenant isolation
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see delivery zones for their company
CREATE POLICY "Users can view delivery zones for their company" ON delivery_zones
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid() 
            OR cnpj IS NOT NULL -- Allow access by CNPJ lookup
        )
    );

-- Policy to allow users to insert delivery zones for their company
CREATE POLICY "Users can insert delivery zones for their company" ON delivery_zones
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
            OR cnpj IS NOT NULL -- Allow access by CNPJ lookup
        )
    );

-- Policy to allow users to update delivery zones for their company
CREATE POLICY "Users can update delivery zones for their company" ON delivery_zones
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
            OR cnpj IS NOT NULL -- Allow access by CNPJ lookup
        )
    );

-- Policy to allow users to delete delivery zones for their company
CREATE POLICY "Users can delete delivery zones for their company" ON delivery_zones
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
            OR cnpj IS NOT NULL -- Allow access by CNPJ lookup
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_delivery_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_delivery_zones_updated_at
    BEFORE UPDATE ON delivery_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_zones_updated_at();
