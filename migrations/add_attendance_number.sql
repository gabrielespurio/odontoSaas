-- Add attendance_number column to consultations table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultations' AND column_name = 'attendance_number') THEN
        ALTER TABLE consultations ADD COLUMN attendance_number VARCHAR(6) UNIQUE;
    END IF;
END $$;

-- Create a sequence for attendance numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS attendance_number_seq START 1;

-- Create or replace function to generate attendance numbers
CREATE OR REPLACE FUNCTION generate_attendance_number() RETURNS VARCHAR(6) AS $$
DECLARE
    next_num INTEGER;
    attendance_num VARCHAR(6);
BEGIN
    SELECT nextval('attendance_number_seq') INTO next_num;
    attendance_num := LPAD(next_num::TEXT, 6, '0');
    RETURN attendance_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate attendance numbers
CREATE OR REPLACE FUNCTION set_attendance_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.attendance_number IS NULL THEN
        NEW.attendance_number := generate_attendance_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_set_attendance_number ON consultations;

-- Create trigger
CREATE TRIGGER tr_set_attendance_number
    BEFORE INSERT ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION set_attendance_number();