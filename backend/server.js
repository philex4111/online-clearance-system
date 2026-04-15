require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('./config/db'); 

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// DATABASE CONNECTION & SETUP
// ===============================
(async () => {
  try {
    // 1. Test Connection
    const res = await sql`SELECT NOW()`; 
    console.log('✅ Database connected successfully');
    console.log('🕒 Database time:', res[0].now);

    // 2. Create Audit Table Automatically (FIX FOR "UPDATE FAILED" ERROR)
    // This ensures the table exists before you try to write to it
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        actor_email VARCHAR(255),
        action VARCHAR(255),
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('📜 Audit Logs table is ready.');

  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

// Routes
const authRoutes = require('./routes/authRoutes');
const clearanceRoutes = require('./routes/clearanceRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/clearance', clearanceRoutes);
app.use('/api/department', departmentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Online Clearance System API running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});