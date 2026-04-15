import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaUserGraduate, FaRocket, FaCheckCircle, FaClock,
  FaSignOutAlt, FaBell, FaLock, FaTimesCircle,
  FaChevronLeft, FaPlus, FaGraduationCap
} from 'react-icons/fa';
import './StudentDashboard.css';

const API = 'http://localhost:5000';

// ─── Status icon + colour helpers ────────────────────────────────────────────
const STATUS_META = {
  approved:    { icon: '✅', label: 'Approved',  color: '#27ae60', bg: '#e8f5ee' },
  rejected:    { icon: '❌', label: 'Rejected',  color: '#e74c3c', bg: '#fdedec' },
  pending:     { icon: '⏳', label: 'Pending',   color: '#e67e22', bg: '#fef3e2' },
  locked:      { icon: '🔒', label: 'Locked',    color: '#95a5a6', bg: '#f4f6f7' },
};

function StatusBadge({ status, isLocked }) {
  const key = isLocked ? 'locked' : status;
  const meta = STATUS_META[key] || STATUS_META.pending;
  return (
    <span style={{
      background: meta.bg, color: meta.color,
      padding: '4px 12px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: '5px'
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

// ─── Overall badge for clearance card ────────────────────────────────────────
function OverallBadge({ status }) {
  const map = {
    cleared:     { label: 'CLEARED',     color: '#27ae60', bg: '#e8f5ee' },
    rejected:    { label: 'REJECTED',    color: '#e74c3c', bg: '#fdedec' },
    in_progress: { label: 'IN PROGRESS', color: '#e67e22', bg: '#fef3e2' },
  };
  const m = map[status] || map.in_progress;
  return (
    <span style={{
      background: m.bg, color: m.color,
      padding: '4px 14px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 700
    }}>{m.label}</span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const navigate = useNavigate();

  // View state: 'list' | 'form' | 'detail'
  const [view, setView] = useState('list');

  // Data
  const [clearances, setClearances] = useState([]);    // all past/current clearances
  const [selectedClearance, setSelectedClearance] = useState(null);
  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);

  // Form state
  const [form, setForm] = useState({
    school_id: '', course_id: '', academic_year: '', semester: ''
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectInputs, setRejectInputs] = useState({}); // rejection reason per dept (not used here, but reserved)

  // ── On mount ──
  useEffect(() => {
    fetchClearances();
    fetchSchools();
  }, []);

  // When school changes, reset course and fetch new list
  useEffect(() => {
    if (form.school_id) {
      fetchCourses(form.school_id);
      setForm(f => ({ ...f, course_id: '' }));
    } else {
      setCourses([]);
    }
  }, [form.school_id]);

  // ── API calls ──
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const fetchClearances = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/clearance/status`, { headers: authHeaders() });
      setClearances(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await axios.get(`${API}/api/clearance/schools`, { headers: authHeaders() });
      setSchools(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourses = async (schoolId) => {
    try {
      const res = await axios.get(`${API}/api/clearance/courses/${schoolId}`, { headers: authHeaders() });
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitClearance = async () => {
    if (!form.school_id || !form.course_id || !form.academic_year || !form.semester) {
      alert('Please fill in all fields before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/clearance/start`, form, { headers: authHeaders() });
      alert('✅ Clearance request submitted successfully!');
      setForm({ school_id: '', course_id: '', academic_year: '', semester: '' });
      setCourses([]);
      await fetchClearances();
      setView('list');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Submission failed.';
      alert(`❌ ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  const openDetail = (clearance) => {
    setSelectedClearance(clearance);
    setView('detail');
  };

  // ── Derived stats for list view ──
  const totalClearances = clearances.length;
  const clearedCount = clearances.filter(c => c.overall_status === 'cleared').length;

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: LIST VIEW
  // ──────────────────────────────────────────────────────────────────────────
  const renderList = () => (
    <div className="student-content">
      {/* Header row */}
      <div className="welcome-section">
        <div>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>My Clearances</h2>
          <p style={{ margin: '5px 0 0', color: '#a4b0be' }}>
            Manage and track your semester clearance requests.
          </p>
        </div>
        <button className="start-btn" onClick={() => setView('form')}>
          <FaPlus /> New Clearance Request
        </button>
      </div>

      {/* Quick stats */}
      <div className="progress-grid">
        <div className="progress-card">
          <div className="icon-holder bg-purple"><FaGraduationCap /></div>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px' }}>{totalClearances}</h2>
            <span style={{ color: '#a4b0be', fontSize: '14px' }}>Total Requests</span>
          </div>
        </div>
        <div className="progress-card">
          <div className="icon-holder bg-green"><FaCheckCircle /></div>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px' }}>{clearedCount}</h2>
            <span style={{ color: '#a4b0be', fontSize: '14px' }}>Fully Cleared</span>
          </div>
        </div>
        <div className="progress-card">
          <div className="icon-holder bg-yellow"><FaClock /></div>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px' }}>{totalClearances - clearedCount}</h2>
            <span style={{ color: '#a4b0be', fontSize: '14px' }}>In Progress</span>
          </div>
        </div>
      </div>

      {/* Clearance cards */}
      <div className="status-table-container">
        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Clearance History</h3>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#a4b0be' }}>
            Loading your clearance records...
          </p>
        ) : clearances.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#a4b0be' }}>
            <FaRocket size={48} style={{ marginBottom: '16px', color: '#27ae60', opacity: 0.4 }} />
            <p style={{ fontSize: '16px', margin: 0 }}>No clearance requests yet.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Click <strong>"New Clearance Request"</strong> above to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {clearances.map(cl => {
              const approvedCount = cl.departments.filter(d => d.status === 'approved').length;
              const totalDepts    = cl.departments.length;
              const pct = totalDepts > 0 ? Math.round((approvedCount / totalDepts) * 100) : 0;

              return (
                <div
                  key={cl.request_id}
                  onClick={() => openDetail(cl)}
                  style={{
                    background: '#fff', border: '1px solid #e8f5ee',
                    borderLeft: '5px solid #27ae60',
                    borderRadius: '12px', padding: '18px 24px',
                    cursor: 'pointer', transition: '0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f6fbf8'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '15px' }}>
                      Year {cl.academic_year} &mdash; Semester {cl.semester}
                    </div>
                    <div style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '3px' }}>
                      {cl.school_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '2px' }}>
                      {cl.course_name}
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: '10px', width: '220px' }}>
                      <div style={{ background: '#e8f5ee', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: cl.overall_status === 'rejected' ? '#e74c3c' : '#27ae60',
                          borderRadius: '10px', transition: '0.4s'
                        }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px' }}>
                        {approvedCount}/{totalDepts} departments cleared
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <OverallBadge status={cl.overall_status} />
                    <div style={{ fontSize: '11px', color: '#b2bec3', marginTop: '8px' }}>
                      Click to view details
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: NEW CLEARANCE FORM
  // ──────────────────────────────────────────────────────────────────────────
  const renderForm = () => (
    <div className="student-content">
      <div className="welcome-section">
        <div>
          <button
            onClick={() => setView('list')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#27ae60', fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', padding: 0
            }}
          >
            <FaChevronLeft size={12} /> Back to My Clearances
          </button>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>New Clearance Request</h2>
          <p style={{ margin: '5px 0 0', color: '#a4b0be' }}>
            Fill in your details below. One request per semester is allowed.
          </p>
        </div>
      </div>

      <div className="status-table-container" style={{ maxWidth: '600px' }}>

        {/* SCHOOL */}
        <div style={{ marginBottom: '22px' }}>
          <label style={labelStyle}>1. Select Your School</label>
          <select
            style={selectStyle}
            value={form.school_id}
            onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}
          >
            <option value="">-- Choose a school --</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* COURSE */}
        <div style={{ marginBottom: '22px' }}>
          <label style={labelStyle}>2. Select Your Course</label>
          <select
            style={{ ...selectStyle, opacity: form.school_id ? 1 : 0.5 }}
            value={form.course_id}
            onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
            disabled={!form.school_id}
          >
            <option value="">-- Choose a course --</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!form.school_id && (
            <p style={{ fontSize: '12px', color: '#a4b0be', marginTop: '5px' }}>
              Select a school first to see available courses.
            </p>
          )}
        </div>

        {/* ACADEMIC YEAR */}
        <div style={{ marginBottom: '22px' }}>
          <label style={labelStyle}>3. Academic Year</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {[1, 2, 3, 4].map(yr => (
              <button
                key={yr}
                onClick={() => setForm(f => ({ ...f, academic_year: yr }))}
                style={{
                  ...pillBtn,
                  background: form.academic_year === yr ? '#1a7a4a' : '#e8f5ee',
                  color:      form.academic_year === yr ? '#fff'    : '#1a7a4a',
                  border: `2px solid ${form.academic_year === yr ? '#1a7a4a' : '#c3e6cb'}`,
                }}
              >
                Year {yr}
              </button>
            ))}
          </div>
        </div>

        {/* SEMESTER */}
        <div style={{ marginBottom: '30px' }}>
          <label style={labelStyle}>4. Semester</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {[1, 2].map(sem => (
              <button
                key={sem}
                onClick={() => setForm(f => ({ ...f, semester: sem }))}
                style={{
                  ...pillBtn,
                  background: form.semester === sem ? '#1a7a4a' : '#e8f5ee',
                  color:      form.semester === sem ? '#fff'    : '#1a7a4a',
                  border: `2px solid ${form.semester === sem ? '#1a7a4a' : '#c3e6cb'}`,
                }}
              >
                Semester {sem}
              </button>
            ))}
          </div>
        </div>

        {/* Department flow info box */}
        <div style={{
          background: '#f0f4f2', border: '1px solid #c3e6cb',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px'
        }}>
          <div style={{ fontWeight: 700, color: '#1a7a4a', marginBottom: '8px' }}>
            📋 How the clearance process works:
          </div>
          <div style={{ color: '#555', lineHeight: '1.8' }}>
            <strong>Step 1 — Primary departments</strong> (must be cleared first):<br />
            &nbsp;&nbsp;• Dean of Students &nbsp;&nbsp;• Finance &nbsp;&nbsp;• Registrar
            <br /><br />
            <strong>Step 2 — Secondary departments</strong> (unlocked after Step 1):<br />
            &nbsp;&nbsp;• Library &nbsp;&nbsp;• Halls &amp; Estates &nbsp;&nbsp;• Sports &amp; Entertainment
          </div>
        </div>

        <button
          className="start-btn"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleSubmitClearance}
          disabled={submitting || !form.school_id || !form.course_id || !form.academic_year || !form.semester}
        >
          <FaRocket />
          {submitting ? 'Submitting...' : 'Submit Clearance Request'}
        </button>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: DETAIL VIEW
  // ──────────────────────────────────────────────────────────────────────────
  const renderDetail = () => {
    if (!selectedClearance) return null;
    const cl = selectedClearance;

    const primaryDepts   = cl.departments.filter(d => d.is_primary);
    const secondaryDepts = cl.departments.filter(d => !d.is_primary);
    const allPrimaryDone = primaryDepts.every(d => d.status === 'approved');

    return (
      <div className="student-content">
        {/* Back button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => { setSelectedClearance(null); setView('list'); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#27ae60', fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '5px', padding: 0
            }}
          >
            <FaChevronLeft size={12} /> Back to My Clearances
          </button>
        </div>

        {/* Clearance info card */}
        <div style={{
          background: '#fff', borderRadius: '14px', padding: '24px',
          border: '1px solid #e8f5ee', marginBottom: '20px',
          borderTop: '5px solid #27ae60'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', color: '#2c3e50' }}>
                Year {cl.academic_year} &mdash; Semester {cl.semester}
              </h2>
              <p style={{ margin: '0 0 3px', color: '#7f8c8d', fontSize: '14px' }}>{cl.school_name}</p>
              <p style={{ margin: 0, color: '#95a5a6', fontSize: '13px' }}>{cl.course_name}</p>
            </div>
            <OverallBadge status={cl.overall_status} />
          </div>

          {/* Overall progress bar */}
          <div style={{ marginTop: '20px' }}>
            {(() => {
              const approved = cl.departments.filter(d => d.status === 'approved').length;
              const total    = cl.departments.length;
              const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7f8c8d', marginBottom: '6px' }}>
                    <span>Overall progress</span>
                    <span>{approved}/{total} departments cleared ({pct}%)</span>
                  </div>
                  <div style={{ background: '#e8f5ee', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: cl.overall_status === 'rejected' ? '#e74c3c' : '#27ae60',
                      borderRadius: '10px', transition: '0.5s'
                    }} />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Rejection warning */}
        {cl.departments.some(d => d.status === 'rejected') && (
          <div style={{
            background: '#fdedec', border: '1px solid #f5c6cb',
            borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
            color: '#721c24', fontSize: '13px'
          }}>
            ❌ <strong>One or more departments have rejected your request.</strong><br />
            Please visit the relevant office to resolve the issue. Once resolved, the department officer will re-approve your clearance.
          </div>
        )}

        {/* PRIMARY DEPARTMENTS */}
        <div className="status-table-container" style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#1a7a4a', marginBottom: '6px', fontSize: '15px' }}>
            🔑 Primary Departments
          </h3>
          <p style={{ color: '#a4b0be', fontSize: '12px', marginTop: 0, marginBottom: '16px' }}>
            These must all be approved before secondary departments are unlocked.
          </p>
          <table className="status-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Status</th>
                <th>Comment</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {primaryDepts.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{d.dept_name}</td>
                  <td><StatusBadge status={d.status} isLocked={d.is_locked} /></td>
                  <td style={{ fontSize: '13px', color: '#7f8c8d' }}>{d.comment || '—'}</td>
                  <td style={{ fontSize: '12px', color: '#b2bec3' }}>
                    {new Date(d.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECONDARY DEPARTMENTS */}
        <div className="status-table-container">
          <h3 style={{ color: '#1a7a4a', marginBottom: '6px', fontSize: '15px' }}>
            🔓 Secondary Departments
          </h3>
          <p style={{ color: '#a4b0be', fontSize: '12px', marginTop: 0, marginBottom: '16px' }}>
            {allPrimaryDone
              ? '✅ Primary departments cleared — these are now accessible to process your clearance.'
              : '🔒 Locked until all primary departments approve your request.'}
          </p>
          <table className="status-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Status</th>
                <th>Comment</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {secondaryDepts.map((d, i) => (
                <tr key={i} style={{ opacity: d.is_locked ? 0.55 : 1 }}>
                  <td style={{ fontWeight: 600 }}>
                    {d.is_locked && <FaLock size={11} color="#95a5a6" style={{ marginRight: '6px' }} />}
                    {d.dept_name}
                  </td>
                  <td><StatusBadge status={d.status} isLocked={d.is_locked} /></td>
                  <td style={{ fontSize: '13px', color: '#7f8c8d' }}>{d.comment || '—'}</td>
                  <td style={{ fontSize: '12px', color: '#b2bec3' }}>
                    {d.is_locked ? '—' : new Date(d.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fully cleared celebration */}
        {cl.overall_status === 'cleared' && (
          <div style={{
            background: 'linear-gradient(135deg, #1a7a4a, #27ae60)',
            color: '#fff', borderRadius: '14px', padding: '24px',
            textAlign: 'center', marginTop: '20px'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ margin: '0 0 8px' }}>Fully Cleared!</h3>
            <p style={{ margin: 0, opacity: 0.85, fontSize: '14px' }}>
              You have been cleared by all departments for Year {cl.academic_year}, Semester {cl.semester}.
              <br />Visit the Registrar's office to collect your clearance certificate.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── Inline styles for form elements ──
  const labelStyle = {
    display: 'block', fontWeight: 600, color: '#2c3e50',
    marginBottom: '8px', fontSize: '14px'
  };
  const selectStyle = {
    width: '100%', padding: '12px 16px',
    border: '2px solid #c3e6cb', borderRadius: '10px',
    fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    background: '#f6fbf8', cursor: 'pointer',
    transition: '0.2s'
  };
  const pillBtn = {
    padding: '10px 20px', borderRadius: '25px',
    cursor: 'pointer', fontWeight: 600, fontSize: '13px',
    fontFamily: 'inherit', transition: '0.2s', flex: 1,
    textAlign: 'center'
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="student-container">
      {/* SIDEBAR */}
      <div className="student-sidebar">
        <div className="student-brand"><FaUserGraduate /> My Portal</div>

        <div
          className={`nav-link ${view !== 'detail' && view !== 'form' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          <FaRocket /> My Clearances
        </div>
        <div
          className={`nav-link ${view === 'form' ? 'active' : ''}`}
          onClick={() => setView('form')}
        >
          <FaPlus /> New Request
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="nav-link" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="student-main">
        {/* HEADER */}
        <div className="student-header">
          <div style={{ fontWeight: 600, color: '#2c3e50' }}>
            Student Portal — Taita Taveta University
          </div>
          <div className="student-profile">
            <FaBell size={18} color="#a4b0be" style={{ cursor: 'pointer' }} />
            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#dfe6e9' }} />
          </div>
        </div>

        {/* VIEWS */}
        {view === 'list'   && renderList()}
        {view === 'form'   && renderForm()}
        {view === 'detail' && renderDetail()}
      </div>
    </div>
  );
};

export default StudentDashboard;