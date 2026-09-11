-- Function to check medicine inventory alerts and notify nurse/clinic_staff
-- Returns low stock and near-expiry medicines, creates notifications

CREATE OR REPLACE FUNCTION check_medicine_inventory_alerts()
RETURNS TABLE (
  alert_type TEXT,
  medicine_name TEXT,
  medicine_id UUID,
  detail TEXT,
  severity TEXT
) AS $$
DECLARE
  low_stock_rec RECORD;
  near_expiry_rec RECORD;
  nurse_clinic_users UUID[];
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  -- Get all active nurse and clinic_staff user IDs
  SELECT ARRAY_AGG(ur.user_id) INTO nurse_clinic_users
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name IN ('nurse', 'clinic_staff')
    AND ur.is_active = TRUE;

  -- If no users found, skip
  IF nurse_clinic_users IS NULL OR array_length(nurse_clinic_users, 1) = 0 THEN
    RETURN;
  END IF;

  -- LOW STOCK: medicines where total active batch quantity <= 10
  FOR low_stock_rec IN
    SELECT
      m.id AS medicine_id,
      m.name AS medicine_name,
      COALESCE(SUM(mb.quantity), 0) AS total_stock
    FROM medicines m
    LEFT JOIN medicine_batches mb ON mb.medicine_id = m.id AND mb.is_active = TRUE
    WHERE m.is_active = TRUE
    GROUP BY m.id, m.name
    HAVING COALESCE(SUM(mb.quantity), 0) <= 10
  LOOP
    -- Create notification for each user (avoid duplicates from today)
    FOR i IN 1..array_length(nurse_clinic_users, 1) LOOP
      INSERT INTO notifications (user_id, title, body, notification_type, metadata)
      SELECT
        nurse_clinic_users[i],
        'Low Stock Alert',
        format('"%s" has only %s units remaining', low_stock_rec.medicine_name, low_stock_rec.total_stock),
        'warning',
        jsonb_build_object(
          'medicine_id', low_stock_rec.medicine_id,
          'medicine_name', low_stock_rec.medicine_name,
          'stock_quantity', low_stock_rec.total_stock,
          'alert_type', 'low_stock'
        )
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = nurse_clinic_users[i]
          AND n.notification_type = 'warning'
          AND n.metadata->>'medicine_id' = low_stock_rec.medicine_id::TEXT
          AND n.metadata->>'alert_type' = 'low_stock'
          AND n.created_at::DATE = CURRENT_DATE
      );
    END LOOP;

    alert_type := 'low_stock';
    medicine_name := low_stock_rec.medicine_name;
    medicine_id := low_stock_rec.medicine_id;
    detail := format('%s units remaining', low_stock_rec.total_stock);
    severity := CASE WHEN low_stock_rec.total_stock <= 3 THEN 'critical' ELSE 'warning' END;
    RETURN NEXT;
  END LOOP;

  -- NEAR EXPIRY: batches expiring within 30 days
  FOR near_expiry_rec IN
    SELECT
      m.id AS medicine_id,
      m.name AS medicine_name,
      mb.id AS batch_id,
      mb.batch_number,
      mb.quantity,
      mb.expiry_date,
      (mb.expiry_date - CURRENT_DATE) AS days_until_expiry
    FROM medicines m
    JOIN medicine_batches mb ON mb.medicine_id = m.id AND mb.is_active = TRUE
    WHERE m.is_active = TRUE
      AND mb.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      AND mb.expiry_date >= CURRENT_DATE
  LOOP
    -- Create notification for each user (avoid duplicates from today)
    FOR i IN 1..array_length(nurse_clinic_users, 1) LOOP
      INSERT INTO notifications (user_id, title, body, notification_type, metadata)
      SELECT
        nurse_clinic_users[i],
        'Medicine Expiring Soon',
        format('"%s" batch %s expires in %s days (%s)', near_expiry_rec.medicine_name, near_expiry_rec.batch_number, near_expiry_rec.days_until_expiry, near_expiry_rec.expiry_date),
        'warning',
        jsonb_build_object(
          'medicine_id', near_expiry_rec.medicine_id,
          'medicine_name', near_expiry_rec.medicine_name,
          'batch_number', near_expiry_rec.batch_number,
          'expiry_date', near_expiry_rec.expiry_date,
          'days_until_expiry', near_expiry_rec.days_until_expiry,
          'alert_type', 'near_expiry'
        )
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = nurse_clinic_users[i]
          AND n.notification_type = 'warning'
          AND n.metadata->>'batch_number' = near_expiry_rec.batch_number
          AND n.metadata->>'alert_type' = 'near_expiry'
          AND n.created_at::DATE = CURRENT_DATE
      );
    END LOOP;

    alert_type := 'near_expiry';
    medicine_name := near_expiry_rec.medicine_name;
    medicine_id := near_expiry_rec.medicine_id;
    detail := format('Batch %s expires in %s days', near_expiry_rec.batch_number, near_expiry_rec.days_until_expiry);
    severity := CASE WHEN near_expiry_rec.days_until_expiry <= 7 THEN 'critical' ELSE 'warning' END;
    RETURN NEXT;
  END LOOP;

  -- EXPIRED: batches already past expiry
  FOR near_expiry_rec IN
    SELECT
      m.id AS medicine_id,
      m.name AS medicine_name,
      mb.id AS batch_id,
      mb.batch_number,
      mb.quantity,
      mb.expiry_date,
      (CURRENT_DATE - mb.expiry_date) AS days_expired
    FROM medicines m
    JOIN medicine_batches mb ON mb.medicine_id = m.id AND mb.is_active = TRUE
    WHERE m.is_active = TRUE
      AND mb.expiry_date < CURRENT_DATE
  LOOP
    FOR i IN 1..array_length(nurse_clinic_users, 1) LOOP
      INSERT INTO notifications (user_id, title, body, notification_type, metadata)
      SELECT
        nurse_clinic_users[i],
        'Expired Medicine',
        format('"%s" batch %s expired %s days ago', near_expiry_rec.medicine_name, near_expiry_rec.batch_number, near_expiry_rec.days_expired),
        'warning',
        jsonb_build_object(
          'medicine_id', near_expiry_rec.medicine_id,
          'medicine_name', near_expiry_rec.medicine_name,
          'batch_number', near_expiry_rec.batch_number,
          'expiry_date', near_expiry_rec.expiry_date,
          'alert_type', 'expired'
        )
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = nurse_clinic_users[i]
          AND n.notification_type = 'warning'
          AND n.metadata->>'batch_number' = near_expiry_rec.batch_number
          AND n.metadata->>'alert_type' = 'expired'
          AND n.created_at::DATE = CURRENT_DATE
      );
    END LOOP;

    alert_type := 'expired';
    medicine_name := near_expiry_rec.medicine_name;
    medicine_id := near_expiry_rec.medicine_id;
    detail := format('Batch %s expired %s days ago', near_expiry_rec.batch_number, near_expiry_rec.days_expired);
    severity := 'critical';
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
