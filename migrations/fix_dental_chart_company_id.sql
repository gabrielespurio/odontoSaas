-- Add company_id column to dental_chart table if it doesn't exist
ALTER TABLE dental_chart ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Update existing dental_chart records to have company_id = 1 (default company)
-- We'll match based on the patient's company_id
UPDATE dental_chart 
SET company_id = (
  SELECT patients.company_id 
  FROM patients 
  WHERE patients.id = dental_chart.patient_id
)
WHERE dental_chart.company_id IS NULL;

-- Make company_id NOT NULL for dental_chart table
ALTER TABLE dental_chart ALTER COLUMN company_id SET NOT NULL;