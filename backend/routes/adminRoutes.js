const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Strict Protection: Only Admins allowed
router.use(verifyToken, authorizeRoles('admin'));

// Route 1: Get All System Users
router.get('/users', adminController.getUsers);

// Route 2: See overview of all student progress
router.get('/all', adminController.getAllRequests);

// Route 3: Get the final graduation list
router.get('/cleared', adminController.getClearedStudents);

// Route 4: Create a new User
router.post('/add-user', adminController.addUser);

// Route 5: Get System Audit Logs
router.get('/logs', adminController.getSystemLogs);

// Route 6: Get List of Departments (Real IDs)
router.get('/departments', adminController.getDepartments);

// Route 7: Reset a student's clearance (admin tool / demo reset)
router.delete('/clearance/:studentId', adminController.resetStudentClearance);

module.exports = router;