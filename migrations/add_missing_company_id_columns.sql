-- Add company_id columns to tables that might be missing them

-- Add company_id to user_profiles table if it doesn't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Add company_id to procedure_categories table if it doesn't exist
ALTER TABLE procedure_categories ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Update existing records to have company_id = 1 (default company)
UPDATE user_profiles SET company_id = 1 WHERE company_id IS NULL;
UPDATE procedure_categories SET company_id = 1 WHERE company_id IS NULL;

-- Make company_id NOT NULL for these tables
ALTER TABLE user_profiles ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE procedure_categories ALTER COLUMN company_id SET NOT NULL;

-- Create default user profiles if they don't exist
INSERT INTO user_profiles (company_id, name, description, modules, is_active) 
VALUES 
  (1, 'Administrador', 'Perfil com acesso total ao sistema', '["dashboard", "patients", "schedule", "appointments", "procedures", "financial", "reports", "settings", "companies"]', true),
  (1, 'Dentista', 'Perfil para dentistas com acesso a pacientes e agendamentos', '["dashboard", "patients", "schedule", "appointments", "procedures"]', true),
  (1, 'Recepcionista', 'Perfil para recepcionistas com acesso limitado', '["dashboard", "patients", "schedule", "appointments"]', true)
ON CONFLICT DO NOTHING;

-- Create default procedure categories if they don't exist
INSERT INTO procedure_categories (company_id, name, description, is_active)
VALUES 
  (1, 'Dentística', 'Procedimentos restauradores e estéticos', true),
  (1, 'Endodontia', 'Tratamentos de canal', true),
  (1, 'Periodontia', 'Tratamentos de gengiva e periodonto', true),
  (1, 'Cirurgia', 'Procedimentos cirúrgicos', true),
  (1, 'Ortodontia', 'Tratamentos ortodônticos', true),
  (1, 'Prótese', 'Próteses dentárias', true),
  (1, 'Prevenção', 'Procedimentos preventivos', true)
ON CONFLICT DO NOTHING;