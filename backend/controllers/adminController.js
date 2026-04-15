const sql = require('../config/db');
const bcrypt = require('bcryptjs'); 

// 1. Get All System Users
exports.getUsers = async (req, res) => {
  try {
    const users = await sql`
      SELECT u.id, u.email, u.role, d.name as dept_name 
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.role, u.email
    `;
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

// 2. View All Clearance Requests
exports.getAllRequests = async (req, res) => {
  try {
    const report = await sql`
      SELECT 
        s.id AS student_id,
        s.full_name, s.registration_number, cr.id AS request_id,
        COUNT(cs.id) AS total_depts,
        COUNT(CASE WHEN cs.status = 'approved' THEN 1 END) AS approved_count,
        COUNT(CASE WHEN cs.status = 'rejected' THEN 1 END) AS rejected_count
      FROM clearance_requests cr
      JOIN students s ON cr.student_id = s.id
      JOIN clearance_status cs ON cs.clearance_request_id = cr.id
      GROUP BY s.id, s.full_name, s.registration_number, cr.id
    `;
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Report failed' });
  }
};

// 3. Get Graduates
exports.getClearedStudents = async (req, res) => {
  try {
    const graduates = await sql`
      SELECT s.full_name, s.registration_number, s.program
      FROM clearance_requests cr
      JOIN students s ON cr.student_id = s.id
      WHERE NOT EXISTS (
        SELECT 1 FROM clearance_status cs
        WHERE cs.clearance_request_id = cr.id
        AND cs.status != 'approved'
      )
    `;
    res.json(graduates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fetch failed' });
  }
};

// 4. Create New User
exports.addUser = async (req, res) => {
  try {
    const { email, password, role, department_id, full_name, reg_number } = req.body;
    const adminId = req.user.id; 
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await sql`
      INSERT INTO users (email, password, role, department_id)
      VALUES (${email}, ${hashedPassword}, ${role}, ${department_id || null})
      RETURNING id
    `;
    const userId = newUser[0].id;

    if (role === 'student') {
      await sql`
        INSERT INTO students (user_id, full_name, registration_number)
        VALUES (${userId}, ${full_name}, ${reg_number})
      `;
    }

    try {
      const admin = await sql`SELECT email FROM users WHERE id = ${adminId}`;
      const adminEmail = admin.length > 0 ? admin[0].email : 'Unknown';
      await sql`
        INSERT INTO audit_logs (actor_email, action, details)
        VALUES (${adminEmail}, 'CREATE_USER', ${`Created new ${role}: ${email}`})
      `;
    } catch (logErr) {
      console.error("⚠️ Audit Log failed:", logErr.message);
    }

    res.json({ message: 'User created successfully' });
  } catch (err) {
    console.error("❌ Add User Error:", err);
    if (err.code === '23505') {
      if (err.constraint && err.constraint.includes('department_id')) {
        return res.status(400).json({ error: 'That Department already has a staff member!' });
      }
      return res.status(400).json({ error: 'Email already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
};

// 5. Get System Logs
exports.getSystemLogs = async (req, res) => {
  try {
    const logs = await sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50`;
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fetch logs failed' });
  }
};

// 6. Get Departments
exports.getDepartments = async (req, res) => {
  try {
    const depts = await sql`SELECT id, name FROM departments ORDER BY name`;
    res.json(depts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fetch departments failed' });
  }
};

// 7. Reset a Student's Clearance (for demos and admin corrections)
// Deletes all clearance_status rows and the clearance_request for this student
// so they can click "Start Clearance Process" again from scratch.
exports.resetStudentClearance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const adminId = req.user.id;

    // Verify the student exists
    const student = await sql`SELECT id, full_name FROM students WHERE id = ${studentId}`;
    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find all clearance requests for this student
    const requests = await sql`
      SELECT id FROM clearance_requests WHERE student_id = ${studentId}
    `;

    if (requests.length === 0) {
      return res.status(400).json({ error: 'This student has no active clearance to reset.' });
    }

    const requestIds = requests.map(r => r.id);

    // Delete clearance_status rows first (foreign key child)
    await sql`
      DELETE FROM clearance_status
      WHERE clearance_request_id = ANY(${requestIds})
    `;

    // Delete the clearance_request rows (parent)
    await sql`
      DELETE FROM clearance_requests WHERE student_id = ${studentId}
    `;

    // Log the action
    try {
      const admin = await sql`SELECT email FROM users WHERE id = ${adminId}`;
      const adminEmail = admin.length > 0 ? admin[0].email : 'Unknown';
      await sql`
        INSERT INTO audit_logs (actor_email, action, details)
        VALUES (
          ${adminEmail},
          'RESET_CLEARANCE',
          ${`Reset clearance for student: ${student[0].full_name} (ID: ${studentId})`}
        )
      `;
    } catch (logErr) {
      console.error("⚠️ Audit Log failed:", logErr.message);
    }

    res.json({ message: `Clearance reset successfully for ${student[0].full_name}` });
  } catch (err) {
    console.error("❌ Reset Clearance Error:", err);
    res.status(500).json({ error: err.message });
  }
};