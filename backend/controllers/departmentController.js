const sql = require('../config/db');
const { tryUnlockSecondaryDepts } = require('./clearanceController');

// ─── Helper: get this officer's department ID ─────────────────────────────────
async function getOfficerDeptId(userId) {
  const officer = await sql`SELECT department_id FROM users WHERE id = ${userId}`;
  if (officer.length === 0 || !officer[0].department_id) return null;
  return officer[0].department_id;
}

// ─── 1. Pending Requests (only unlocked, only pending) ───────────────────────
exports.getPendingRequests = async (req, res) => {
  try {
    const myDeptId = await getOfficerDeptId(req.user.id);
    if (!myDeptId) {
      return res.status(403).json({ message: 'You are not assigned to a department.' });
    }

    const requests = await sql`
      SELECT
        cs.id               AS status_id,
        s.full_name,
        s.registration_number,
        cs.status,
        cs.is_locked,
        cs.comment,
        cs.updated_at,
        cr.academic_year,
        cr.semester,
        cr.school_name,
        cr.course_name
      FROM clearance_status cs
      JOIN clearance_requests cr ON cs.clearance_request_id = cr.id
      JOIN students s ON cr.student_id = s.id
      WHERE cs.department_id = ${myDeptId}
        AND cs.status    = 'pending'
        AND cs.is_locked = false
      ORDER BY cr.academic_year DESC, cr.semester DESC
    `;

    res.json(requests);
  } catch (err) {
    console.error('getPendingRequests error:', err);
    res.status(500).json({ error: 'Fetch failed' });
  }
};

// ─── 2. History (approved or rejected — not locked, not pending) ─────────────
exports.getHistory = async (req, res) => {
  try {
    const myDeptId = await getOfficerDeptId(req.user.id);
    if (!myDeptId) {
      return res.status(403).json({ message: 'You are not assigned to a department.' });
    }

    const history = await sql`
      SELECT
        cs.id               AS status_id,
        s.full_name,
        s.registration_number,
        cs.status,
        cs.is_locked,
        cs.comment,
        cs.updated_at,
        cr.academic_year,
        cr.semester,
        cr.school_name,
        cr.course_name
      FROM clearance_status cs
      JOIN clearance_requests cr ON cs.clearance_request_id = cr.id
      JOIN students s ON cr.student_id = s.id
      WHERE cs.department_id = ${myDeptId}
        AND cs.status != 'pending'
      ORDER BY cs.updated_at DESC
    `;

    res.json(history);
  } catch (err) {
    console.error('getHistory error:', err);
    res.status(500).json({ error: 'Fetch failed' });
  }
};

// ─── 3. Approve / Reject ─────────────────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status_id, status, comment } = req.body;
    const userId = req.user.id;

    if (!status) return res.status(400).json({ message: 'Status is required.' });

    // Rejection MUST have a comment explaining why
    if (status === 'rejected' && (!comment || comment.trim() === '')) {
      return res.status(400).json({ message: 'A reason is required when rejecting a request.' });
    }

    // Verify this status row belongs to this officer's department (security check)
    const myDeptId = await getOfficerDeptId(userId);
    const csRow = await sql`
      SELECT cs.id, cs.clearance_request_id, cs.is_locked, cs.department_id
      FROM clearance_status cs
      WHERE cs.id = ${status_id}
    `;
    if (csRow.length === 0) {
      return res.status(404).json({ message: 'Clearance status record not found.' });
    }
    if (csRow[0].department_id !== myDeptId) {
      return res.status(403).json({ message: 'This request does not belong to your department.' });
    }
    if (csRow[0].is_locked) {
      return res.status(403).json({ message: 'This clearance is locked. Primary departments must approve first.' });
    }

    const requestId = csRow[0].clearance_request_id;

    // Update the status
    await sql`
      UPDATE clearance_status
      SET status     = ${status},
          comment    = ${comment || null},
          updated_at = NOW()
      WHERE id = ${status_id}
    `;

    // If approved and this is a primary dept, try to unlock secondary depts
    if (status === 'approved') {
      const deptInfo = await sql`SELECT is_primary FROM departments WHERE id = ${myDeptId}`;
      if (deptInfo.length > 0 && deptInfo[0].is_primary) {
        await tryUnlockSecondaryDepts(requestId);
      }
    }

    // Audit log
    try {
      const user = await sql`SELECT email FROM users WHERE id = ${userId}`;
      const actorEmail = user.length > 0 ? user[0].email : 'Unknown';
      await sql`
        INSERT INTO audit_logs (actor_email, action, details)
        VALUES (
          ${actorEmail},
          ${status.toUpperCase()},
          ${`${status === 'approved' ? 'Approved' : 'Rejected'} clearance status ID ${status_id}${comment ? ': ' + comment : ''}`}
        )
      `;
    } catch (logErr) {
      console.error('⚠️ Audit log failed:', logErr.message);
    }

    res.json({ message: `Student ${status} successfully.` });
  } catch (err) {
    console.error('updateStatus error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
};