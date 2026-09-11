-- Seed: Common university clinic medicines (Philippine setting)
-- Uses ON CONFLICT DO NOTHING for idempotency

-- Medicines
INSERT INTO medicines (name, generic_name, category, form, strength, manufacturer) VALUES
  -- Analgesics / Pain Relief
  ('Paracetamol', 'Acetaminophen', 'analgesic', 'tablet', '500mg', 'United Laboratories'),
  ('Paracetamol', 'Acetaminophen', 'analgesic', 'tablet', '650mg', 'United Laboratories'),
  ('Paracetamol', 'Acetaminophen', 'analgesic', 'syrup', '120mg/5mL', 'United Laboratories'),
  ('Mefenamic Acid', 'Mefenamic Acid', 'analgesic', 'capsule', '500mg', 'Pfizer'),
  ('Ibuprofen', 'Ibuprofen', 'analgesic', 'tablet', '400mg', 'Boehringer Ingelheim'),
  ('Ibuprofen', 'Ibuprofen', 'analgesic', 'tablet', '200mg', 'Boehringer Ingelheim'),
  ('Celecoxib', 'Celecoxib', 'analgesic', 'capsule', '200mg', 'Pfizer'),

  -- Antibiotics
  ('Amoxicillin', 'Amoxicillin', 'antibiotic', 'capsule', '500mg', 'Laboratories Phoenix'),
  ('Amoxicillin', 'Amoxicillin', 'antibiotic', 'capsule', '250mg', 'Laboratories Phoenix'),
  ('Amoxicillin', 'Amoxicillin', 'antibiotic', 'syrup', '125mg/5mL', 'Laboratories Phoenix'),
  ('Azithromycin', 'Azithromycin', 'antibiotic', 'tablet', '500mg', 'Pfizer'),
  ('Azithromycin', 'Azithromycin', 'antibiotic', 'tablet', '250mg', 'Pfizer'),
  ('Cefalexin', 'Cefalexin', 'antibiotic', 'capsule', '500mg', 'United Laboratories'),
  ('Erythromycin', 'Erythromycin', 'antibiotic', 'tablet', '500mg', 'Abbott'),
  ('Metronidazole', 'Metronidazole', 'antibiotic', 'tablet', '500mg', 'Sanofi'),
  ('Doxycycline', 'Doxycycline', 'antibiotic', 'capsule', '100mg', 'Pfizer'),

  -- Antihistamines
  ('Cetirizine', 'Cetirizine HCl', 'antihistamine', 'tablet', '10mg', 'United Laboratories'),
  ('Loratadine', 'Loratadine', 'antihistamine', 'tablet', '10mg', 'Bayer'),
  ('Chlorphenamine', 'Chlorphenamine Maleate', 'antihistamine', 'tablet', '4mg', 'GlaxoSmithKline'),

  -- Antacids / GI
  ('Omeprazole', 'Omeprazole', 'gastrointestinal', 'capsule', '20mg', 'AstraZeneca'),
  ('Ranitidine', 'Ranitidine', 'gastrointestinal', 'tablet', '150mg', 'GlaxoSmithKline'),
  ('Hyoscine', 'Hyoscine Butylbromide', 'gastrointestinal', 'tablet', '10mg', 'Boehringer Ingelheim'),
  ('Loperamide', 'Loperamide HCl', 'gastrointestinal', 'capsule', '2mg', 'Johnson & Johnson'),
  ('ORS', 'Oral Rehydration Salts', 'gastrointestinal', 'other', '1 sachet', 'WHO/UNICEF'),

  -- Cough / Cold
  ('Ambroxol', 'Ambroxol HCl', 'respiratory', 'tablet', '30mg', 'Berlin Pharmaceutical'),
  ('Guaifenesin', 'Guaifenesin + Dextromethorphan', 'respiratory', 'syrup', '100mL', 'Pascual Laboratories'),
  ('Salbutamol', 'Salbutamol', 'respiratory', 'inhaler', '100mcg', 'GlaxoSmithKline'),
  ('Budesonide', 'Budesonide', 'respiratory', 'inhaler', '200mcg', 'AstraZeneca'),

  -- Vitamins / Supplements
  ('Ascorbic Acid', 'Vitamin C', 'vitamin', 'tablet', '500mg', 'United Laboratories'),
  ('Ascorbic Acid', 'Vitamin C', 'vitamin', 'tablet', '100mg', 'United Laboratories'),
  ('Multivitamins', 'Centrum', 'vitamin', 'tablet', '1 tablet', 'Pfizer'),
  ('Vitamin D3', 'Cholecalciferol', 'vitamin', 'capsule', '1000 IU', 'Ritemed'),
  ('Ferrous Sulfate', 'Iron Supplement', 'vitamin', 'tablet', '300mg', 'United Laboratories'),
  ('Folic Acid', 'Folic Acid', 'vitamin', 'tablet', '5mg', 'Pascual Laboratories'),

  -- Antipyretics
  ('Ibuprofen (Antipyretic)', 'Ibuprofen', 'antipyretic', 'syrup', '100mg/5mL', 'United Laboratories'),

  -- Topical
  ('Mupirocin', 'Mupirocin', 'topical', 'ointment', '2%', 'GlaxoSmithKline'),
  ('Betamethasone', 'Betamethasone Valerate', 'topical', 'ointment', '0.1%', 'GlaxoSmithKline'),
  ('Clotrimazole', 'Clotrimazole', 'topical', 'ointment', '1%', 'Bayer'),
  ('Calamine Lotion', 'Calamine', 'topical', 'other', '100mL', 'Pascual Laboratories'),
  ('Povidone Iodine', 'Povidone-Iodine', 'topical', 'other', '10%', 'FL Maritime'),

  -- Antidiabetic (for FBS/diabetes monitoring)
  ('Metformin', 'Metformin HCl', 'antidiabetic', 'tablet', '500mg', 'Merck'),
  ('Metformin', 'Metformin HCl', 'antidiabetic', 'tablet', '850mg', 'Merck'),

  -- Antihypertensive
  ('Amlodipine', 'Amlodipine Besylate', 'antihypertensive', 'tablet', '5mg', 'Pfizer'),
  ('Losartan', 'Losartan Potassium', 'antihypertensive', 'tablet', '50mg', 'Merck'),

  -- Emergency
  ('Epinephrine', 'Epinephrine', 'emergency', 'injection', '1mg/mL', 'Pfizer'),
  ('Dextrose 50%', 'Dextrose', 'emergency', 'injection', '50mL', 'B. Braun'),

  -- Dental
  ('Lidocaine', 'Lidocaine HCl with Epinephrine', 'dental', 'injection', '2% 1:80,000', 'Septodont'),
  ('Chlorhexidine', 'Chlorhexidine Gluconate', 'dental', 'other', '0.12%', 'Sigma Pharmaceuticals')
ON CONFLICT DO NOTHING;

-- Seed initial inventory batches (sample stock)
INSERT INTO medicine_batches (medicine_id, batch_number, quantity, unit_price, expiry_date, manufactured_date)
SELECT
  m.id,
  'BATCH-2026-' || LPAD(ROW_NUMBER() OVER (ORDER BY m.name)::TEXT, 3, '0'),
  CASE
    WHEN m.form = 'tablet' OR m.form = 'capsule' THEN 500
    WHEN m.form = 'syrup' OR m.form = 'suspension' THEN 100
    WHEN m.form = 'inhaler' THEN 50
    WHEN m.form = 'injection' THEN 50
    WHEN m.form = 'ointment' THEN 75
    ELSE 100
  END,
  CASE
    WHEN m.category = 'emergency' THEN 150.00
    WHEN m.category = 'dental' THEN 200.00
    WHEN m.form = 'inhaler' THEN 350.00
    WHEN m.form = 'injection' THEN 80.00
    ELSE ROUND((RANDOM() * 10 + 2)::NUMERIC, 2)
  END,
  '2028-12-31',
  '2025-06-01'
FROM medicines m
WHERE NOT EXISTS (
  SELECT 1 FROM medicine_batches mb WHERE mb.medicine_id = m.id
);
