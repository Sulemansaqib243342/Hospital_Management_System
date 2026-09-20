const { getConnection } = require('../db/connection');

exports.getAllMedicines = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    let result;
    try {
      // Try the optimized view first
      result = await conn.query(
        `SELECT medicine_id, name, category, unit, quantity, min_quantity, price,
                expiry_date, supplier, stock_status
         FROM medicine_inventory_v ORDER BY name`
      );
    } catch (viewErr) {
      // View not created yet - fall back to base table with inline CASE
      console.warn('medicine_inventory_v not found, falling back to medicines table:', viewErr.message);
      result = await conn.query(
        `SELECT medicine_id, name, category, unit, quantity, min_quantity, price,
                expiry_date, supplier,
                CASE
                  WHEN quantity = 0 THEN 'out_of_stock'
                  WHEN quantity <= min_quantity THEN 'low'
                  ELSE 'ok'
                END as stock_status
         FROM medicines ORDER BY name`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('getAllMedicines error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.getLowStock = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT medicine_id, name, category, quantity, min_quantity, expiry_date
       FROM medicines WHERE quantity <= min_quantity ORDER BY quantity ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.addMedicine = async (req, res) => {
  const { name, category, unit, quantity, min_quantity, price, expiry_date, supplier } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `INSERT INTO medicines (name, category, unit, quantity, min_quantity, price, expiry_date, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8)`,
      [name, category, unit, quantity, min_quantity, price, expiry_date, supplier]
    );
    res.status(201).json({ message: 'Medicine added successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.updateStock = async (req, res) => {
  const { quantity } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE medicines SET quantity = quantity + $1 WHERE medicine_id = $2`,
      [quantity, req.params.id]
    );
    res.json({ message: 'Stock updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.getPrescriptions = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT pr.prescription_id, pr.quantity, pr.dosage, pr.duration, pr.dispensed, pr.prescribed_at,
              p.full_name as patient_name,
              s.full_name as doctor_name,
              m.name as medicine_name, m.unit
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.patient_id
       JOIN staff s ON pr.doctor_id = s.staff_id
       JOIN medicines m ON pr.medicine_id = m.medicine_id
       ORDER BY pr.prescribed_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.addPrescription = async (req, res) => {
  const { patient_id, doctor_id, medicine_id, quantity, dosage, duration } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `CALL sp_add_prescription($1, $2, $3, $4, $5, $6)`,
      [patient_id, doctor_id, medicine_id, quantity, dosage, duration]
    );
    res.status(201).json({ message: 'Prescription added and stock updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.updateMedicine = async (req, res) => {
  const { name, category, unit, quantity, min_quantity, price, expiry_date, supplier } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `UPDATE medicines SET name=$1, category=$2, unit=$3, quantity=$4,
       min_quantity=$5, price=$6, expiry_date=$7::date, supplier=$8
       WHERE medicine_id=$9`,
      [name, category, unit, quantity, min_quantity, price, expiry_date, supplier, req.params.id]
    );
    res.json({ message: 'Medicine updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.deleteMedicine = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `DELETE FROM medicines WHERE medicine_id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Medicine deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};
