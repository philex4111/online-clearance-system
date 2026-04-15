import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding, FaClipboardList, FaSignOutAlt,
  FaBell, FaCheckCircle, FaHistory, FaLock, FaTimesCircle
} from 'react-icons/fa';
import './DepartmentDashboard.css';

const API = 'http://localhost:5000';

const DepartmentDashboard = () => {
  const [requests, setRequests] = useState([]);  // pending (unlocked only)
  const [history, setHistory]   = useState([]);  // processed
  const [activeTab, setActiveTab] = useState('requests');
  const [rejectInputs, setRejectInputs] = useState({}); // {status_id: comment}
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const fetchData = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        axios.get(`${API}/api/department/pending`, { headers: authHeaders() }),
        axios.get(`${API}/api/department/history`, { headers: authHeaders() }),
      ]);
      setRequests(pendingRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id, status) => {
    const comment = rejectInputs[id] || '';

    // Confirm change on history items
    if (activeTab === 'history') {
      if (!window.confirm(`Change this student's status to "${status}"?`)) return;
    }

    // Require rejection reason
    if (status === 'rejected' && !comment.trim()) {
      alert('⚠️ Please enter a reason for rejection before clicking Reject.');
      return;
    }

    try {
      await axios.put(
        `${API}/api/department/update`,
        {
          status_id: id,
          status,
          comment: status === 'approved' ? 'Approved — cleared.' : comment
        },
        { headers: authHeaders() }
      );
      alert(`✅ Student ${status} successfully.`);
      setRejectInputs(prev => { const n = { ...prev }; delete n[id]; return n; });
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Update failed';
      alert(`❌ ${msg}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  // ── Info pill ──
  const InfoPill = ({ label, value, color = '#27ae60' }) => (
    <span style={{
      background: '#f0f4f2', color,
      fontSize: '11px', fontWeight: 600,
      padding: '2px 8px', borderRadius: '12px',
      marginRight: '6px', display: 'inline-block'
    }}>
      {label}: {value}
    </span>
  );

  // ── Table ──
  const renderTable = (data) => (
    <div className="request-table-container">
      <h3 style={{ marginBottom: '6px', color: '#2c3e50' }}>
        {activeTab === 'requests' ? 'Incoming Clearance Requests' : 'Processed History'}
      </h3>
      <p style={{ marginTop: 0, marginBottom: '20px', color: '#a4b0be', fontSize: '13px' }}>
        {activeTab === 'requests'
          ? 'Only unlocked requests are shown. Locked requests are awaiting primary department approvals.'
          : 'Previously approved or rejected requests. You can still change a decision if needed.'}
      </p>

      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#a4b0be' }}>
          {activeTab === 'requests'
            ? '🎉 No pending requests — you\'re all caught up!'
            : 'No processed records yet.'}
        </div>
      ) : (
        <table className="dept-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Details</th>
              <th>Status</th>
              <th style={{ minWidth: '280px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(req => (
              <tr key={req.status_id}>
                {/* Student info */}
                <td>
                  <div style={{ fontWeight: 700, color: '#2c3e50' }}>{req.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#95a5a6' }}>{req.registration_number}</div>
                </td>

                {/* Year / Sem / School / Course */}
                <td>
                  <InfoPill label="Year" value={req.academic_year} />
                  <InfoPill label="Sem" value={req.semester} />
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>
                    {req.school_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#95a5a6' }}>
                    {req.course_name}
                  </div>
                </td>

                {/* Status */}
                <td>
                  <span style={{
                    fontWeight: 700,
                    color: req.status === 'approved' ? '#27ae60'
                         : req.status === 'rejected' ? '#e74c3c'
                         : '#e67e22'
                  }}>
                    {req.status === 'approved' ? '✅ Approved'
                   : req.status === 'rejected' ? '❌ Rejected'
                   : '⏳ Pending'}
                  </span>
                  {req.comment && (
                    <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '3px' }}>
                      "{req.comment}"
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Rejection reason input (always visible so officer can add reason before clicking Reject) */}
                    <input
                      type="text"
                      placeholder="Rejection reason (required to reject)"
                      value={rejectInputs[req.status_id] || ''}
                      onChange={e => setRejectInputs(prev => ({
                        ...prev, [req.status_id]: e.target.value
                      }))}
                      style={{
                        width: '100%', padding: '6px 10px',
                        border: '1px solid #c3e6cb', borderRadius: '6px',
                        fontSize: '12px', fontFamily: 'inherit', outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="action-btn approve-btn"
                        onClick={() => handleUpdate(req.status_id, 'approved')}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="action-btn reject-btn"
                        onClick={() => handleUpdate(req.status_id, 'rejected')}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="dept-container">
      {/* SIDEBAR */}
      <div className="dept-sidebar">
        <div className="dept-brand"><FaBuilding /> Dept. Panel</div>

        <div
          className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <FaClipboardList /> Pending Requests
          {requests.length > 0 && (
            <span style={{
              background: '#e74c3c', color: '#fff',
              borderRadius: '50%', width: '20px', height: '20px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, marginLeft: 'auto'
            }}>
              {requests.length}
            </span>
          )}
        </div>

        <div
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <FaHistory /> History
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="nav-item" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="dept-main">
        <div className="dept-header">
          <div style={{ fontWeight: 600, color: '#2c3e50' }}>
            Department Officer — Taita Taveta University
          </div>
          <div className="dept-profile">
            <FaBell size={18} color="#a4b0be" />
            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#dfe6e9' }} />
          </div>
        </div>

        <div className="dept-content">
          {/* STAT CARDS */}
          <div className="dept-stats">
            <div className="stat-box">
              <div className="icon-wrapper orange-bg"><FaClipboardList /></div>
              <div>
                <h2 style={{ margin: 0, fontSize: '28px' }}>{requests.length}</h2>
                <span style={{ color: '#a4b0be', fontSize: '14px' }}>Awaiting Action</span>
              </div>
            </div>
            <div className="stat-box">
              <div className="icon-wrapper blue-bg"><FaCheckCircle /></div>
              <div>
                <h2 style={{ margin: 0, fontSize: '28px' }}>{history.length}</h2>
                <span style={{ color: '#a4b0be', fontSize: '14px' }}>Processed</span>
              </div>
            </div>
          </div>

          {/* Info notice for secondary departments */}
          <div style={{
            background: '#f0f4f2', border: '1px solid #c3e6cb',
            borderRadius: '10px', padding: '12px 16px',
            marginBottom: '20px', fontSize: '13px', color: '#555',
            display: 'flex', alignItems: 'flex-start', gap: '10px'
          }}>
            <FaLock color="#27ae60" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>
              <strong>Locking rule:</strong> If your department is a secondary department (Library, Halls &amp; Estates, Sports &amp; Entertainment),
              student requests only appear here after <strong>Dean of Students, Finance, and Registrar</strong> have all approved.
              If you see no requests, primary departments may still be pending.
            </span>
          </div>

          {activeTab === 'requests' && renderTable(requests)}
          {activeTab === 'history'  && renderTable(history)}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDashboard;