const sql = require('../config/db');

// ─── Helper ──────────────────────────────────────────────────────────────────
// After any primary department is approved, check if ALL primaries are done.
// If yes, unlock all secondary departments for this request.
async function tryUnlockSecondaryDepts(requestId) {
  try {
    // How many primary depts are there?
    const primaries = await sql`
      SELECT d.id
      FROM departments d
      WHERE d.is_primary = true
    `;

    // How many are approved for this request?
    const approved = await sql`
      SELECT cs.id
      FROM clearance_status cs
      JOIN departments d ON cs.department_id = d.id
      WHERE cs.clearance_request_id = ${requestId}
        AND d.is_primary = true
        AND cs.status = 'approved'
    `;

    if (approved.length === primaries.length && primaries.length > 0) {
      // All primary depts cleared — unlock secondaries
      await sql`
        UPDATE clearance_status
        SET is_locked = false
        WHERE clearance_request_id = ${requestId}
          AND is_locked = true
      `;
      console.log(`✅ Secondary depts unlocked for request ${requestId}`);
    }
  } catch (err) {
    console.error('⚠️ tryUnlockSecondaryDepts failed:', err.message);
  }
}

// ─── 1. Get All Schools ───────────────────────────────────────────────────────
exports.getSchools = async (req, res) => {
  try {
    const schools = await sql`SELECT id, name FROM schools ORDER BY name`;
    res.json(schools);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};

// ─── 2. Get Courses for a School ─────────────────────────────────────────────
exports.getCoursesBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const courses = await sql`
      SELECT id, name, category, duration_years
      FROM courses
      WHERE school_id = ${schoolId}
      ORDER BY name
    `;
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// ─── 3. Start Clearance Request ──────────────────────────────────────────────
exports.createClearanceRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { school_id, course_id, academic_year, semester } = req.body;

    // Validate inputs
    if (!school_id || !course_id || !academic_year || !semester) {
      return res.status(400).json({ message: 'School, course, academic year and semester are all required.' });
    }
    if (![1, 2].includes(Number(semester))) {
      return res.status(400).json({ message: 'Semester must be 1 or 2.' });
    }
    if (![1, 2, 3, 4].includes(Number(academic_year))) {
      return res.status(400).json({ message: 'Academic year must be 1, 2, 3, or 4.' });
    }

    // A. Find the student record
    const students = await sql`SELECT id FROM students WHERE user_id = ${userId}`;
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student profile not found. Please contact Admin.' });
    }
    const studentId = students[0].id;

    // B. Fetch school and course names for display
    const schoolRow  = await sql`SELECT name FROM schools  WHERE id = ${school_id}`;
    const courseRow  = await sql`SELECT name FROM courses  WHERE id = ${course_id}`;
    if (schoolRow.length === 0 || courseRow.length === 0) {
      return res.status(400).json({ message: 'Invalid school or course selected.' });
    }
    const schoolName = schoolRow[0].name;
    const courseName = courseRow[0].name;

    // C. Enforce one clearance per student per academic year per semester
    //    (unique constraint on DB will also catch this, but give a friendly message)
    const existing = await sql`
      SELECT id FROM clearance_requests
      WHERE student_id   = ${studentId}
        AND academic_year = ${Number(academic_year)}
        AND semester       = ${Number(semester)}
    `;
    if (existing.length > 0) {
      return res.status(400).json({
        message: `You already have a clearance request for Year ${academic_year}, Semester ${semester}. You can only apply once per semester.`
      });
    }

    // D. Create the clearance request
    const newReq = await sql`
      INSERT INTO clearance_requests (student_id, status, academic_year, semester, school_name, course_name)
      VALUES (${studentId}, 'Pending', ${Number(academic_year)}, ${Number(semester)}, ${schoolName}, ${courseName})
      RETURNING id
    `;
    const requestId = newReq[0].id;

    // E. Get departments in order (primary first, then secondary)
    const departments = await sql`
      SELECT id, is_primary
      FROM departments
      ORDER BY sequence_order ASC
    `;

    // F. Insert clearance_status rows:
    //    Primary depts → is_locked = false (accessible immediately)
    //    Secondary depts → is_locked = true (locked until primaries are done)
    for (const dept of departments) {
      const locked = !dept.is_primary;
      await sql`
        INSERT INTO clearance_status (clearance_request_id, department_id, status, is_locked)
        VALUES (${requestId}, ${dept.id}, 'pending', ${locked})
      `;
    }

    res.status(201).json({ message: 'Clearance request submitted successfully!' });

  } catch (err) {
    console.error('createClearanceRequest error:', err);
    // Catch the DB unique violation just in case
    if (err.code === '23505') {
      return res.status(400).json({ message: 'You already have a clearance request for this semester.' });
    }
    res.status(500).json({ error: 'Server Error' });
  }
};

// ─── 4. Get Student's Clearance Status (all semesters) ───────────────────────
// Returns an array of clearance records, each with its department statuses.
exports.getStudentClearanceStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student
    const students = await sql`SELECT id FROM students WHERE user_id = ${userId}`;
    if (students.length === 0) return res.json([]);
    const studentId = students[0].id;

    // Get all clearance requests for this student
    const requests = await sql`
      SELECT id, academic_year, semester, school_name, course_name, status, created_at
      FROM clearance_requests
      WHERE student_id = ${studentId}
      ORDER BY academic_year DESC, semester DESC
    `;

    if (requests.length === 0) return res.json([]);

    // For each request, fetch its department statuses
    const result = [];
    for (const req of requests) {
      const deptStatuses = await sql`
        SELECT
          cs.id          AS status_id,
          d.name         AS dept_name,
          d.is_primary,
          d.sequence_order,
          cs.status,
          cs.is_locked,
          cs.comment,
          cs.updated_at
        FROM clearance_status cs
        JOIN departments d ON cs.department_id = d.id
        WHERE cs.clearance_request_id = ${req.id}
        ORDER BY d.sequence_order ASC
      `;

      // Compute an overall status for the request
      const allApproved = deptStatuses.every(d => d.status === 'approved');
      const anyRejected = deptStatuses.some(d => d.status === 'rejected');
      const overallStatus = allApproved ? 'cleared' : anyRejected ? 'rejected' : 'in_progress';

      result.push({
        request_id:    req.id,
        academic_year: req.academic_year,
        semester:      req.semester,
        school_name:   req.school_name,
        course_name:   req.course_name,
        overall_status: overallStatus,
        created_at:    req.created_at,
        departments:   deptStatuses
      });
    }

    res.json(result);

  } catch (err) {
    console.error('getStudentClearanceStatus error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};

// ─── 5. Exported helper (used by departmentController) ───────────────────────
exports.tryUnlockSecondaryDepts = tryUnlockSecondaryDepts;