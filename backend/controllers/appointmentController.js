const { getConnection } = require('../db/connection');

exports.getAllAppointments = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    let result;
    try {
      result = await conn.query(
        `SELECT a.appt_id, a.appt_date, a.appt_time, a.reason, a.status, a.notes,
                p.full_name AS patient_name, p.phone AS patient_phone,
                d.full_name AS doctor_name, dept.dept_name AS dept_name
         FROM appointments a
         LEFT JOIN patients p ON a.patient_id = p.patient_id
         LEFT JOIN staff d ON a.doctor_id = d.staff_id
         LEFT JOIN departments dept ON a.dept_id = dept.dept_id
         ORDER BY a.appt_date DESC, a.appt_time ASC`
      );
    } catch (viewErr) {
      console.warn('appointment_details_v not found, falling back to appointments table:', viewErr.message);
      result = await conn.query(
        `SELECT a.appt_id, a.appt_date, a.appt_time, a.reason, a.status, a.notes,
                p.full_name AS patient_name, p.phone AS patient_phone,
                d.full_name AS doctor_name, dept.dept_name AS dept_name
         FROM appointments a
         LEFT JOIN patients p ON a.patient_id = p.patient_id
         LEFT JOIN staff d ON a.doctor_id = d.staff_id
         LEFT JOIN departments dept ON a.dept_id = dept.dept_id
         ORDER BY a.appt_date DESC, a.appt_time ASC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('getAllAppointments error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.getTodayAppointments = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    let result;
    try {
      result = await conn.query(
        `SELECT appt_id, appt_time, reason, status,
                patient_name, doctor_name, dept_name
         FROM appointment_details_v
         WHERE DATE(appt_date) = CURRENT_DATE
         ORDER BY appt_time ASC`
      );
    } catch (viewErr) {
      // Fallback join query when view is missing
      result = await conn.query(
        `SELECT a.appt_id, a.appt_time, a.reason, a.status,
                 p.full_name AS patient_name, d.full_name AS doctor_name, dept.dept_name AS dept_name
         FROM appointments a
         LEFT JOIN patients p ON a.patient_id = p.patient_id
         LEFT JOIN staff d ON a.doctor_id = d.staff_id
         LEFT JOIN departments dept ON a.dept_id = dept.dept_id
         WHERE DATE(a.appt_date) = CURRENT_DATE
         ORDER BY a.appt_time ASC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.createAppointment = async (req, res) => {
  const { patient_id, doctor_id, dept_id, appt_date, appt_time, reason, notes } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `INSERT INTO appointments (patient_id, doctor_id, dept_id, appt_date, appt_time, reason, notes)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7)`,
      [patient_id, doctor_id, dept_id, appt_date, appt_time, reason, notes]
    );
    res.status(201).json({ message: 'Appointment booked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  const { status } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE appointments SET status = $1 WHERE appt_id = $2`,
      [status, req.params.id]
    );
    res.json({ message: 'Appointment status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.deleteAppointment = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `DELETE FROM appointments WHERE appt_id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.attendPatient = async (req, res) => {
  const { notes, prescriptions } = req.body;
  const appt_id = req.params.id;
  let conn;
  
  try {
    conn = await getConnection();
    
    // Start transaction
    await conn.query('BEGIN');
    
    // 1. Get patient_id and doctor_id from appointment
    const result = await conn.query(
      `SELECT patient_id, doctor_id FROM appointments WHERE appt_id = $1`,
      [appt_id]
    );
    
    if (result.rows.length === 0) {
      await conn.query('ROLLBACK');
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // pg returns lowercased keys by default, regardless of quoting unless quoted differently in creation
    const { patient_id: pat_id, doctor_id: doc_id } = result.rows[0];

    // 2. Update appointment notes and status
    await conn.query(
      `UPDATE appointments SET notes = $1, status = 'completed' WHERE appt_id = $2`,
      [notes, appt_id]
    );

    // 3. Insert prescriptions if any
    if (prescriptions && prescriptions.length > 0) {
      for (const p of prescriptions) {
        await conn.query(
          `INSERT INTO prescriptions (patient_id, doctor_id, medicine_id, quantity, dosage, duration)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pat_id, doc_id, p.medicine_id, p.quantity, p.dosage, p.duration]
        );
      }
    }

    // Commit transaction
    await conn.query('COMMIT');
    res.json({ message: 'Patient attended successfully' });
    
  } catch (err) {
    if (conn) await conn.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};
