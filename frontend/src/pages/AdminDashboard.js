import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaUserGraduate, FaChalkboardTeacher, FaUsers, FaSearch, 
  FaBell, FaSignOutAlt, FaChartPie, FaHistory, FaUserPlus, FaTrashAlt
} from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [studentProgress, setStudentProgress] = useState([]);
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [resettingId, setResettingId] = useState(null); // tracks which student is being reset

  const [formData, setFormData] = useState({ 
    email: '', password: '', role: 'student', full_name: '', reg_number: '', department_id: '' 
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const userRes     = await axios.get('http://localhost:5000/api/admin/users',       { headers });
      setUsers(userRes.data);

      const progressRes = await axios.get('http://localhost:5000/api/admin/all',         { headers });
      setStudentProgress(progressRes.data);

      const logsRes     = await axios.get('http://localhost:5000/api/admin/logs',        { headers });
      setLogs(logsRes.data);

      const deptRes     = await axios.get('http://localhost:5000/api/admin/departments', { headers });
      setDepartments(deptRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/admin/add-user', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('User Created Successfully!');
      setFormData({ email: '', password: '', role: 'student', full_name: '', reg_number: '', department_id: '' });
      fetchData(); 
      setActiveTab('users'); 
    } catch (err) {
      const serverMessage = err.response?.data?.error || 'Failed to create user.';
      alert(`Error: ${serverMessage}`);
    }
  };

  // Reset a student's clearance so they can restart from scratch (demo fix + admin correction)
  const handleResetClearance = async (studentId, studentName) => {
    const confirmed = window.confirm(
      `⚠️ Reset clearance for "${studentName}"?\n\nThis will delete ALL their clearance data so they can start again. This cannot be undone.`
    );
    if (!confirmed) return;

    setResettingId(studentId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:5000/api/admin/clearance/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`✅ ${res.data.message}`);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Reset failed.';
      alert(`Error: ${msg}`);
    } finally {
      setResettingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  const handlePrint = () => {
    window.print();
  };

  const clearedStudents = studentProgress.filter(s => 
    parseInt(s.total_depts) === parseInt(s.approved_count) && s.total_depts > 0
  );

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <>
      <div className="welcome-banner">
        <h2>System Overview</h2>
        <p>Welcome back, here is what's happening today.</p>
      </div>
      <div className="stats-grid">
        <div className="card">
          <div className="icon-box purple"><FaUsers /></div>
          <div className="card-info"><h3>{users.length}</h3><p>Total Users</p></div>
        </div>
        <div className="card">
          <div className="icon-box orange"><FaChalkboardTeacher /></div>
          <div className="card-info"><h3>{users.filter(u=>u.role==='department').length}</h3><p>Departments</p></div>
        </div>
        <div className="card">
          <div className="icon-box green"><FaUserGraduate /></div>
          <div className="card-info"><h3>{users.filter(u=>u.role==='student').length}</h3><p>Active Students</p></div>
        </div>
      </div>
    </>
  );

  const renderUserTable = (filterRole) => {
    let displayUsers = filterRole ? users.filter(u => u.role === filterRole) : users;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      displayUsers = displayUsers.filter(u => 
        u.email.toLowerCase().includes(lowerQuery) || 
        u.role.toLowerCase().includes(lowerQuery) ||
        (u.dept_name && u.dept_name.toLowerCase().includes(lowerQuery))
      );
    }

    return (
      <div className="table-section">
        <div className="table-header-row" style={{marginBottom:'20px'}}>
          <div className="table-title">
            {filterRole ? `${filterRole.toUpperCase()} LIST` : 'ALL USERS'} 
            {searchQuery && <span style={{fontSize:'14px', color:'#666', marginLeft:'10px'}}>(Searching: "{searchQuery}")</span>}
          </div>
        </div>
        
        {displayUsers.length === 0 ? (
          <p style={{padding:'20px', textAlign:'center', color:'#888'}}>No users found matching "{searchQuery}"</p>
        ) : (
          <table className="custom-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Department</th></tr>
            </thead>
            <tbody>
              {displayUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td>{u.dept_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderStudentProgress = () => (
    <div className="table-section">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div className="table-title">STUDENT CLEARANCE STATUS</div>
        <button onClick={handlePrint} className="add-btn" style={{backgroundColor:'#2c3e50'}}>
          🖨️ Print Graduation List
        </button>
      </div>

      {/* Demo/Admin helper note */}
      <div style={{
        background:'#fff8e1', border:'1px solid #ffe082',
        borderRadius:'6px', padding:'10px 14px',
        marginBottom:'16px', fontSize:'13px', color:'#5d4037'
      }}>
        💡 <strong>Admin tip:</strong> Use the <FaTrashAlt style={{verticalAlign:'middle', marginRight:'3px'}}/>
        Reset button to wipe a student's clearance data so they can restart — useful for demos and corrections.
      </div>

      <table className="custom-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Reg No</th>
            <th>Cleared Depts</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {studentProgress.length === 0 ? (
            <tr><td colSpan="5" style={{textAlign:'center', padding:'30px', color:'#aaa'}}>
              No students have started clearance yet.
            </td></tr>
          ) : (
            studentProgress.map(s => {
              const isFullyCleared = parseInt(s.total_depts) === parseInt(s.approved_count) && s.total_depts > 0;
              const isResetting = resettingId === s.student_id;
              return (
                <tr key={s.request_id}>
                  <td style={{fontWeight:'bold'}}>{s.full_name}</td>
                  <td>{s.registration_number}</td>
                  <td>{s.approved_count} / {s.total_depts}</td>
                  <td>
                    {isFullyCleared 
                      ? <span className="badge badge-student">CLEARED ✅</span> 
                      : <span className="badge badge-department">IN PROGRESS ⏳</span>}
                  </td>
                  <td>
                    <button
                      onClick={() => handleResetClearance(s.student_id, s.full_name)}
                      disabled={isResetting}
                      title="Delete this student's clearance so they can restart"
                      style={{
                        background: isResetting ? '#ccc' : '#e74c3c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '5px 10px',
                        cursor: isResetting ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <FaTrashAlt size={11} />
                      {isResetting ? 'Resetting...' : 'Reset'}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const renderLogs = () => (
    <div className="table-section">
      <div className="table-title">SYSTEM AUDIT TRAIL</div>
      <table className="custom-table">
        <thead>
          <tr><th>Time</th><th>Actor</th><th>Action</th><th>Details</th></tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td style={{fontSize:'13px'}}>{new Date(log.created_at).toLocaleString()}</td>
              <td>{log.actor_email}</td>
              <td><span className={`badge badge-admin`}>{log.action}</span></td>
              <td>{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAddUserForm = () => (
    <div className="table-section" style={{maxWidth: '600px', margin: '0 auto'}}>
      <div className="table-title">Create New User</div>
      <form onSubmit={handleCreateUser} style={{marginTop: '20px'}}>
        <div className="form-group">
          <label>Role</label>
          <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
            <option value="student">Student</option>
            <option value="department">Department Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input className="form-input" required type="email" placeholder="user@test.com"
            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input className="form-input" required type="password" placeholder="******"
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
        </div>
        
        {formData.role === 'department' && (
          <div className="form-group">
            <label>Assign Department</label>
            <select 
              className="form-input" 
              required 
              value={formData.department_id} 
              onChange={e => setFormData({...formData, department_id: e.target.value})}
            >
              <option value="">-- Select Department --</option>
              {departments.length === 0 ? (
                <option disabled>Loading departments...</option>
              ) : (
                departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))
              )}
            </select>
          </div>
        )}

        {formData.role === 'student' && (
          <>
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-input" required placeholder="John Doe"
                value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Registration Number</label>
              <input className="form-input" required placeholder="REG-123"
                value={formData.reg_number} onChange={e => setFormData({...formData, reg_number: e.target.value})} />
            </div>
          </>
        )}
        <button type="submit" className="add-btn" style={{marginTop: '20px', width: '100%', justifyContent: 'center'}}>
          Create User
        </button>
      </form>
    </div>
  );

  const renderPrintableReport = () => (
    <div className="printable-report">
      <div style={{textAlign:'center', marginBottom:'30px'}}>
        <h1>TAITA TAVETA UNIVERSITY</h1>
        <h2>OFFICIAL GRADUATION CLEARANCE LIST</h2>
        <p>Date Generated: {new Date().toLocaleDateString()}</p>
      </div>
      <table className="custom-table" style={{border:'1px solid #000'}}>
        <thead>
          <tr style={{background:'#eee'}}>
            <th style={{border:'1px solid #000', padding:'10px'}}>Student Name</th>
            <th style={{border:'1px solid #000', padding:'10px'}}>Registration No.</th>
            <th style={{border:'1px solid #000', padding:'10px'}}>Clearance Status</th>
          </tr>
        </thead>
        <tbody>
          {clearedStudents.length === 0 ? (
            <tr><td colSpan="3" style={{textAlign:'center', padding:'20px'}}>No students cleared yet.</td></tr>
          ) : (
            clearedStudents.map(s => (
              <tr key={s.request_id}>
                <td style={{border:'1px solid #000', padding:'10px'}}>{s.full_name}</td>
                <td style={{border:'1px solid #000', padding:'10px'}}>{s.registration_number}</td>
                <td style={{border:'1px solid #000', padding:'10px', fontWeight:'bold', color:'green'}}>CLEARED</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div style={{marginTop:'50px', display:'flex', justifyContent:'space-between'}}>
        <div>_______________________<br/>Registrar (Academic)</div>
        <div>_______________________<br/>Dean of Students</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="admin-container">
        <div className="sidebar">
          <div className="brand"><MdDashboard size={30} /> AdminPanel</div>
          <div className={`menu-item ${activeTab==='dashboard'?'active':''}`} onClick={()=>setActiveTab('dashboard')}><FaChartPie /> Dashboard</div>
          <div className={`menu-item ${activeTab==='users'?'active':''}`}      onClick={()=>setActiveTab('users')}><FaUsers /> All Users</div>
          <div className={`menu-item ${activeTab==='staff'?'active':''}`}      onClick={()=>setActiveTab('staff')}><FaChalkboardTeacher /> Staff</div>
          <div className={`menu-item ${activeTab==='students'?'active':''}`}   onClick={()=>setActiveTab('students')}><FaUserGraduate /> Students</div>
          <div className={`menu-item ${activeTab==='logs'?'active':''}`}       onClick={()=>setActiveTab('logs')}><FaHistory /> Audit Logs</div>
          <div className={`menu-item ${activeTab==='add_user'?'active':''}`}   onClick={()=>setActiveTab('add_user')}><FaUserPlus /> Add New User</div>
          <div style={{ marginTop: 'auto' }}>
            <div className="menu-item" onClick={handleLogout}><FaSignOutAlt /> Logout</div>
          </div>
        </div>

        <div className="main-content">
          <div className="top-header">
            <div className="search-box">
              <FaSearch color="#ccc" />
              <input 
                type="text" 
                placeholder="Search by email, role, or department..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="header-profile">
              <FaBell size={20} color="#a4b0be" />
              <div className="profile-pic"></div>
              <div>
                <div style={{fontWeight:'600'}}>Admin User</div>
                <div style={{fontSize:'12px', color:'#a4b0be'}}>Super Admin</div>
              </div>
            </div>
          </div>

          <div className="dashboard-content">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'dashboard' && renderUserTable(null)}
            {activeTab === 'users'     && renderUserTable(null)}
            {activeTab === 'staff'     && renderUserTable('department')}
            {activeTab === 'students'  && renderStudentProgress()}
            {activeTab === 'logs'      && renderLogs()} 
            {activeTab === 'add_user'  && renderAddUserForm()}
          </div>
        </div>
      </div>
      {renderPrintableReport()}
    </>
  );
};

export default AdminDashboard;