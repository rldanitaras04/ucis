-- UCIS Migration: Fix queue duplicate check
-- Adds duplicate active entry prevention to create_queue_entry function

CREATE OR REPLACE FUNCTION public.create_queue_entry(p_clinic_id uuid, p_service_id uuid, p_patient_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next_number INTEGER;
  v_queue_date DATE := CURRENT_DATE;
  v_existing_id UUID;
BEGIN
  -- Check for existing active entry for same patient + clinic + service + date
  SELECT id INTO v_existing_id
  FROM queue_entries
  WHERE patient_id = p_patient_id
    AND clinic_id = p_clinic_id
    AND service_id = p_service_id
    AND queue_date = v_queue_date
    AND status IN ('waiting', 'called', 'in_service')
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'This patient already has an active queue entry for this service today';
  END IF;

  -- Atomically increment queue counter
  INSERT INTO queue_counters (clinic_id, service_id, queue_date, last_number)
  VALUES (p_clinic_id, p_service_id, v_queue_date, 1)
  ON CONFLICT (clinic_id, service_id, queue_date) DO UPDATE
  SET last_number = queue_counters.last_number + 1
  RETURNING last_number INTO v_next_number;

  -- Insert queue entry
  INSERT INTO queue_entries (
    queue_number, clinic_id, service_id, patient_id, queue_date, status
  ) VALUES (
    v_next_number, p_clinic_id, p_service_id, p_patient_id, v_queue_date, 'waiting'
  );

  RETURN v_next_number;
END;
$function$;

GRANT EXECUTE ON FUNCTION create_queue_entry TO authenticated;
