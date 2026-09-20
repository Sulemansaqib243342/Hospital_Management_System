const { getConnection } = require('../db/connection');

exports.getAllBills = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT bill_id, total_amount, paid_amount, payment_mode, status, bill_date, notes,
              patient_name, patient_phone, balance
       FROM billing_summary_v
       ORDER BY bill_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    // Attempt fallback using a fresh connection if original connection failed
    try {
      if (!conn) conn = await getConnection();
      const fallback = await conn.query(
        `SELECT b.bill_id, b.total_amount, b.paid_amount, b.payment_mode, b.status, b.bill_date, b.notes,
                p.full_name as patient_name, p.phone as patient_phone,
                (b.total_amount - COALESCE(b.paid_amount,0)) as balance
         FROM billing b
         JOIN patients p ON b.patient_id = p.patient_id
         ORDER BY b.bill_date DESC`
      );
      res.json(fallback.rows);
    } catch (fallbackErr) {
      res.status(500).json({ message: fallbackErr.message });
    }
  } finally {
    if (conn) conn.release();
  }
};

exports.getBillById = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT b.*, p.full_name as patient_name, p.phone, p.address
       FROM billing b JOIN patients p ON b.patient_id = p.patient_id
       WHERE b.bill_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.createBill = async (req, res) => {
  const { patient_id, admission_id, total_amount, paid_amount, payment_mode, notes } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `INSERT INTO billing (patient_id, admission_id, total_amount, paid_amount, payment_mode, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [patient_id, admission_id, total_amount, paid_amount, payment_mode, notes]
    );
    res.status(201).json({ message: 'Bill created successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.getDashboardStats = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const revenue = await conn.query(
      `SELECT COALESCE(SUM(paid_amount),0) as total_revenue,
              COALESCE(SUM(total_amount - paid_amount),0) as pending_amount,
              COUNT(*) as total_bills
       FROM billing WHERE DATE_TRUNC('month', bill_date) = DATE_TRUNC('month', CURRENT_DATE)`
    );
    const patients = await conn.query(
      `SELECT COUNT(*) as total FROM patients`
    );
    const admissions = await conn.query(
      `SELECT COUNT(*) as inpatients FROM admissions WHERE discharge_date IS NULL`
    );
    const todayAppts = await conn.query(
      `SELECT COUNT(*) as today_appts FROM appointments WHERE DATE(appt_date) = CURRENT_DATE`
    );
    res.json({
      revenue: revenue.rows[0],
      totalPatients: patients.rows[0].total,
      inpatients: admissions.rows[0].inpatients,
      todayAppointments: todayAppts.rows[0].today_appts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.autoCalculateBill = async (req, res) => {
  const patient_id = req.params.patient_id;
  let conn;
  try {
    conn = await getConnection();
    
    // 1. Calculate Appointments Cost (Assume $50 per appointment)
    const appts = await conn.query(
      `SELECT COUNT(*) as count FROM appointments WHERE patient_id = $1`,
      [patient_id]
    );
    const apptsCount = appts.rows[0].count;
    const apptsCost = apptsCount * 50;

    // 2. Calculate Pharmacy Cost
    const rx = await conn.query(
      `SELECT SUM(p.quantity * m.price) as total_med_cost, COUNT(p.prescription_id) as med_count
       FROM prescriptions p
       JOIN medicines m ON p.medicine_id = m.medicine_id
       WHERE p.patient_id = $1`,
      [patient_id]
    );
    const medCost = rx.rows[0].total_med_cost || 0;
    const medCount = rx.rows[0].med_count || 0;

    const total = apptsCost + medCost;
    const notes = `Auto-calculated: ${apptsCount} Appointments ($${apptsCost}) + ${medCount} Prescriptions ($${medCost}).`;

    res.json({ suggested_total: total, suggested_notes: notes });

  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.updateBill = async (req, res) => {
  const { total_amount, paid_amount, payment_mode, notes } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE billing SET total_amount=$1, paid_amount=$2, payment_mode=$3, notes=$4
       WHERE bill_id=$5`,
      [total_amount, paid_amount, payment_mode, notes, req.params.id]
    );
    res.json({ message: 'Bill updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.deleteBill = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `DELETE FROM billing WHERE bill_id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Bill deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.updatePayment = async (req, res) => {
  const { amount, payment_mode } = req.body;
  const bill_id = req.params.id;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT total_amount, paid_amount FROM billing WHERE bill_id = $1`,
      [bill_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    const currentBill = result.rows[0];
    const total_amount = Number(currentBill.total_amount || 0);
    const new_paid_amount = Number(currentBill.paid_amount || 0) + Number(amount);
    
    const status = new_paid_amount >= total_amount ? 'paid' : (new_paid_amount > 0 ? 'partial' : 'pending');
    
    await conn.query(
      `UPDATE billing SET paid_amount = $1, payment_mode = $2, status = $3 WHERE bill_id = $4`,
      [new_paid_amount, payment_mode, status, bill_id]
    );
    
    res.json({ message: 'Payment added successfully', new_paid_amount, status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};
