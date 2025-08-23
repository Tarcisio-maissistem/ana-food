-- Adding subdomain and custom domain fields to companies table
-- Add new columns for subdomain functionality
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
ADD COLUMN IF NOT EXISTS subdomain VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS domain_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON companies(subdomain);
CREATE INDEX IF NOT EXISTS idx_companies_custom_domain ON companies(custom_domain);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- Update existing companies with default subdomains based on name
UPDATE companies 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')),
    subdomain = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL OR subdomain IS NULL;

-- Ensure uniqueness by adding numbers to duplicates
WITH numbered_companies AS (
  SELECT id, subdomain,
         ROW_NUMBER() OVER (PARTITION BY subdomain ORDER BY created_at) as rn
  FROM companies
  WHERE subdomain IS NOT NULL
)
UPDATE companies 
SET subdomain = CASE 
  WHEN nc.rn > 1 THEN companies.subdomain || '-' || nc.rn::text
  ELSE companies.subdomain
END
FROM numbered_companies nc
WHERE companies.id = nc.id;
