-- ====================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS) - POSTGRESQL FUNCTIONS & VIEWS
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. VIEWS
-- --------------------------------------------------------------------

-- View for Patient details including active admission info (Inpatients)
CREATE OR REPLACE VIEW patient_details_v AS
SELECT p.patient_id, 
       p.full_name, 
       p.dob, 
       p.gender, 
       p.blood_group, 
       p.phone, 
       p.email, 
       p.address, 
       p.emergency_contact,
       a.admission_id,
       a.status as admission_status, 
       a.ward, 
       a.bed_number, 
       d.full_name as doctor_name, 
       dep.dept_name, 
       p.created_at
FROM patients p
LEFT JOIN admissions a ON p.patient_id = a.patient_id AND a.discharge_date IS NULL
LEFT JOIN staff d ON a.doctor_id = d.staff_id
LEFT JOIN departments dep ON a.dept_id = dep.dept_id;

-- View for Appointment details
CREATE OR REPLACE VIEW appointment_details_v AS
SELECT a.appt_id, 
       a.appt_date, 
       a.appt_time, 
       a.reason, 
       a.status, 
       a.notes,
       a.patient_id, 
       p.full_name as patient_name, 
       p.phone as patient_phone,
       a.doctor_id, 
       s.full_name as doctor_name, 
       a.dept_id, 
       d.dept_name, 
       a.created_at
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN staff s ON a.doctor_id = s.staff_id
JOIN departments d ON a.dept_id = d.dept_id;

-- View for Billing summaries
CREATE OR REPLACE VIEW billing_summary_v AS
SELECT b.bill_id, 
       b.patient_id, 
       b.admission_id, 
       b.total_amount, 
       b.paid_amount, 
       b.payment_mode, 
       b.status, 
       b.bill_date, 
       b.notes,
       p.full_name as patient_name, 
       p.phone as patient_phone, 
       p.address as patient_address,
       (b.total_amount - b.paid_amount) as balance
FROM billing b
JOIN patients p ON b.patient_id = p.patient_id;

-- View for Medicine Stock status details
CREATE OR REPLACE VIEW medicine_inventory_v AS
SELECT medicine_id, 
       name, 
       category, 
       unit, 
       quantity, 
       min_quantity, 
       price, 
       expiry_date, 
       supplier, 
       created_at,
       CASE 
         WHEN quantity = 0 THEN 'out_of_stock'
         WHEN quantity <= min_quantity THEN 'low'
         ELSE 'ok' 
       END as stock_status
FROM medicines;


-- --------------------------------------------------------------------
-- 2. TRIGGERS
-- --------------------------------------------------------------------

-- Function for Before Insert or Update Trigger on Billing table to set payment status
CREATE OR REPLACE FUNCTION trg_update_billing_status_func()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount >= NEW.total_amount THEN
    NEW.status := 'paid';
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status := 'partial';
  ELSE
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_billing_status
BEFORE INSERT OR UPDATE ON billing
FOR EACH ROW
EXECUTE FUNCTION trg_update_billing_status_func();


-- --------------------------------------------------------------------
-- 3. STORED PROCEDURES WITH EXCEPTIONS
-- --------------------------------------------------------------------

-- Procedure to safely add a prescription and deduct inventory
CREATE OR REPLACE PROCEDURE sp_add_prescription (
    p_patient_id INT,
    p_doctor_id INT,
    p_medicine_id INT,
    p_quantity INT,
    p_dosage VARCHAR,
    p_duration VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stock INT;
    v_med_name VARCHAR(100);
    v_patient_count INT;
    v_doctor_count INT;
BEGIN
    -- 1. Validate Patient Existence
    SELECT COUNT(*) INTO v_patient_count FROM patients WHERE patient_id = p_patient_id;
    IF v_patient_count = 0 THEN
        RAISE EXCEPTION 'Invalid or non-existent Patient ID: %', p_patient_id;
    END IF;

    -- 2. Validate Doctor Existence and Active status
    SELECT COUNT(*) INTO v_doctor_count FROM staff WHERE staff_id = p_doctor_id AND role = 'doctor' AND status = 'active';
    IF v_doctor_count = 0 THEN
        RAISE EXCEPTION 'Invalid or inactive Doctor ID: %', p_doctor_id;
    END IF;

    -- 3. Retrieve Medicine Details and Stock Level
    SELECT quantity, name INTO v_current_stock, v_med_name FROM medicines WHERE medicine_id = p_medicine_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or non-existent Medicine ID: %', p_medicine_id;
    END IF;

    -- 4. Check Stock Availability
    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for medicine: %. Available: %, Requested: %', v_med_name, v_current_stock, p_quantity;
    END IF;

    -- 5. Record the Prescription (defaulting dispensed to 1 for direct pharmacy additions)
    INSERT INTO prescriptions (patient_id, doctor_id, medicine_id, quantity, dosage, duration, dispensed, prescribed_at)
    VALUES (p_patient_id, p_doctor_id, p_medicine_id, p_quantity, p_dosage, p_duration, 1, CURRENT_TIMESTAMP);

    -- 6. Deduct from Inventory Stock
    UPDATE medicines 
    SET quantity = quantity - p_quantity 
    WHERE medicine_id = p_medicine_id;
END;
$$;


-- Procedure to discharge inpatient, compute bills dynamically
CREATE OR REPLACE PROCEDURE sp_discharge_patient (
    p_admission_id INT,
    p_payment_mode VARCHAR,
    p_notes VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_patient_id INT;
    v_admission_date TIMESTAMP;
    v_days INT;
    v_room_cost NUMERIC;
    v_appt_cost NUMERIC := 0;
    v_med_cost NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_status VARCHAR(20);
    
    v_appt_count INT := 0;
    v_med_sum NUMERIC := 0;
BEGIN
    -- 1. Validate Admission and Status
    SELECT patient_id, admission_date, status 
    INTO v_patient_id, v_admission_date, v_status
    FROM admissions 
    WHERE admission_id = p_admission_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or non-existent Admission ID: %', p_admission_id;
    END IF;
    
    IF v_status = 'discharged' THEN
        RAISE EXCEPTION 'Admission ID % has already been discharged.', p_admission_id;
    END IF;
    
    -- 2. Update Admission status and discharge date
    UPDATE admissions 
    SET discharge_date = CURRENT_TIMESTAMP, 
        status = 'discharged' 
    WHERE admission_id = p_admission_id;
    
    -- 3. Calculate Ward Room stay cost (Assume $100 per day, minimum of 1 day)
    v_days := CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_admission_date)) / 86400);
    IF v_days <= 0 THEN
        v_days := 1;
    END IF;
    v_room_cost := v_days * 100;
    
    -- 4. Calculate Appointment Costs
    SELECT COUNT(*) INTO v_appt_count 
    FROM appointments 
    WHERE patient_id = v_patient_id 
      AND appt_date BETWEEN v_admission_date::DATE AND CURRENT_DATE;
      
    v_appt_cost := COALESCE(v_appt_count, 0) * 50; -- Standard $50 per consultation
    
    -- 5. Calculate Medicine Costs
    SELECT COALESCE(SUM(pr.quantity * med.price), 0) INTO v_med_sum
    FROM prescriptions pr
    JOIN medicines med ON pr.medicine_id = med.medicine_id
    WHERE pr.patient_id = v_patient_id 
      AND pr.dispensed = 1;
      
    v_med_cost := v_med_sum;
    
    v_total_cost := v_room_cost + v_appt_cost + v_med_cost;
    
    -- 6. Insert billing record (will trigger trg_update_billing_status)
    INSERT INTO billing (patient_id, admission_id, total_amount, paid_amount, payment_mode, notes, bill_date)
    VALUES (v_patient_id, p_admission_id, v_total_cost, 0, p_payment_mode, 
            'Discharge Bill: Ward Stay (' || v_days || ' days) $' || v_room_cost || 
            ', Appointments $' || v_appt_cost || ', Pharmacy $' || v_med_cost || '. Notes: ' || p_notes, CURRENT_TIMESTAMP);
END;
$$;
