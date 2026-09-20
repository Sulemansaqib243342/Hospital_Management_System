const { getConnection } = require('../db/connection');
const bcrypt = require('bcryptjs');

exports.getAllStaff = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT s.staff_id, s.full_name, s.email, s.phone, s.role, s.designation,
              s.shift, s.status, d.dept_name
       FROM staff s
       LEFT JOIN departments d ON s.dept_id = d.dept_id
       ORDER BY s.role, s.full_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.getDoctors = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT s.staff_id, s.full_name, s.designation, s.shift, d.dept_name
       FROM staff s
       LEFT JOIN departments d ON s.dept_id = d.dept_id
       WHERE s.role = 'doctor' AND s.status = 'active'
       ORDER BY s.full_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.getStaffById = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT s.*, d.dept_name FROM staff s
       LEFT JOIN departments d ON s.dept_id = d.dept_id
       WHERE s.staff_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Staff not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.updateStaff = async (req, res) => {
  const { full_name, email, role, phone, designation, dept_id, shift, status, password } = req.body;
  let conn;
  try {
    conn = await getConnection();
    
    let pwdClause = '';
    let params = [full_name, email, role, phone, designation, dept_id, shift, status, req.params.id];
    let queryParamsCount = 9;

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      pwdClause = `, password = $10`;
      params.push(hashed);
    }

    await conn.query(
      `UPDATE staff SET 
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        phone = COALESCE($4, phone),
        designation = COALESCE($5, designation),
        dept_id = COALESCE($6, dept_id),
        shift = COALESCE($7, shift),
        status = COALESCE($8, status)${pwdClause}
       WHERE staff_id = $9`,
      params
    );
    res.json({ message: 'Staff updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.deleteStaff = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.query(
      `DELETE FROM staff WHERE staff_id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Staff deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};
