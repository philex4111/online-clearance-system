const express = require('express');
const router = express.Router();
const clearanceController = require('../controllers/clearanceController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Public-ish routes (any logged-in user can fetch schools/courses for dropdowns)
router.get('/schools',              verifyToken, clearanceController.getSchools);
router.get('/courses/:schoolId',    verifyToken, clearanceController.getCoursesBySchool);

// Student-only routes
router.post('/start',  verifyToken, authorizeRoles('student'), clearanceController.createClearanceRequest);
router.get('/status',  verifyToken, authorizeRoles('student'), clearanceController.getStudentClearanceStatus);

module.exports = router;