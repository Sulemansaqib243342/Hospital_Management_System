const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../db/connection');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(
      `SELECT staff_id, full_name, email, password, role FROM staff WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const { staff_id, full_name, email: userEmail, password: hashedPwd, role } = result.rows[0];
    const valid = await bcrypt.compare(password, hashedPwd);
    if (!valid) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ staff_id, full_name, role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { staff_id, full_name, email: userEmail, role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};

exports.register = async (req, res) => {
  const { full_name, email, password, role, phone, designation, dept_id, shift } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const hashed = await bcrypt.hash(password, 10);
    await conn.query(
      `INSERT INTO staff (full_name, email, password, role, phone, designation, dept_id, shift)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [full_name, email, hashed, role, phone, designation, dept_id, shift]
    );
    res.status(201).json({ message: 'Staff registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    if (conn) conn.release();
  }
};
