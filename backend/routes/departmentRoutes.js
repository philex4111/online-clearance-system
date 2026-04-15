const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken, authorizeRoles('department'));

// 1. Get Pending Requests
router.get('/pending', departmentController.getPendingRequests);

// 2. Get History (NEW)
router.get('/history', departmentController.getHistory);

// 3. Update Status
router.put('/update', departmentController.updateStatus);

module.exports = router;