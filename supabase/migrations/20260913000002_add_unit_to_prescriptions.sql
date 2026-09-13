-- Add unit column to prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece(s)';
