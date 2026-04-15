const sql = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // We need this for security

exports.register = async (req, res) => {
  const { email, password, role, fullName, regNumber } = req.body;
  try {
    // 1. Check if user exists
    const existing = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Hash Password (Security)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert User
    const newUser = await sql`
      INSERT INTO users (email, password, role)
      VALUES (${email}, ${hashedPassword}, ${role})
      RETURNING id, role
    `;

    // 4. If Student, add to students table
    if (role === 'student') {
      await sql`
        INSERT INTO students (user_id, full_name, registration_number)
        VALUES (${newUser[0].id}, ${fullName}, ${regNumber})
      `;
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. Find user
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }

    const user = users[0];

    // 2. Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      'secretkey123', // In a real app, use process.env.JWT_SECRET
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login server error' });
  }
};