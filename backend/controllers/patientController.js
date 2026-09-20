const { getConnection } = require('../db/connection');

exports.getAllPatients = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    let result;
    try {
      result = await conn.query(
        `SELECT patient_id, full_name, dob, gender, blood_group, phone, email,
                admission_status as status, ward, doctor_name, dept_name
         FROM patient_details_v ORDER BY created_at DESC`
      );
    } catch (viewErr) {
      console.warn('patient_details_v not found, falling back to patients table:', viewErr.message);
      result = await conn.query(
        `SELECT patient_id, full_name, dob, gender, blood_group, phone, email,
                address, emergency_contact, created_at
         FROM patients ORDER BY created_at DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('getAllPatients error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.getPatientById = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT * FROM patients WHERE patient_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.createPatient = async (req, res) => {
  const { full_name, dob, gender, blood_group, phone, email, address, emergency_contact } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `INSERT INTO patients (full_name, dob, gender, blood_group, phone, email, address, emergency_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [full_name, dob, gender, blood_group, phone, email, address, emergency_contact]
    );
    res.status(201).json({ message: 'Patient registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.updatePatient = async (req, res) => {
  const { full_name, dob, gender, blood_group, phone, email, address, emergency_contact } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
  `UPDATE patients SET 
    full_name = COALESCE($1, full_name),
    dob = CASE WHEN $2::date IS NOT NULL THEN $2::date ELSE dob END,
    gender = COALESCE($3, gender),
    blood_group = COALESCE($4, blood_group),
    phone = COALESCE($5, phone),
    email = COALESCE($6, email),
    address = COALESCE($7, address),
    emergency_contact = COALESCE($8, emergency_contact)
   WHERE patient_id = $9`,
  [full_name, dob, gender, blood_group, phone, email, address, emergency_contact, req.params.id]
);
    res.json({ message: 'Patient updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.deletePatient = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `DELETE FROM patients WHERE patient_id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};
