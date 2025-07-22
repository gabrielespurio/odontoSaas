-- Add company_id columns to remaining tables that need multi-tenant isolation

-- Add company_id to anamnese table (relates to patients)
ALTER TABLE anamnese ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Update existing anamnese records to have company_id based on patient's company
UPDATE anamnese 
SET company_id = (
  SELECT patients.company_id 
  FROM patients 
  WHERE patients.id = anamnese.patient_id
)
WHERE anamnese.company_id IS NULL;

-- Make company_id NOT NULL for anamnese table
ALTER TABLE anamnese ALTER COLUMN company_id SET NOT NULL;

-- Add company_id to suppliers table (business data that should be company-specific)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Update existing suppliers to have company_id = 1 (default company)
UPDATE suppliers SET company_id = 1 WHERE company_id IS NULL;

-- Make company_id NOT NULL for suppliers table
ALTER TABLE suppliers ALTER COLUMN company_id SET NOT NULL;

-- Add company_id to financial table (relates to patients and consultations)
ALTER TABLE financial ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Update existing financial records to have company_id based on patient's company
UPDATE financial 
SET company_id = (
  SELECT patients.company_id 
  FROM patients 
  WHERE patients.id = financial.patient_id
)
WHERE financial.company_id IS NULL;

-- Make company_id NOT NULL for financial table
ALTER TABLE financial ALTER COLUMN company_id SET NOT NULL;