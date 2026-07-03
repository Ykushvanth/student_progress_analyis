const express = require('express');
const router = express.Router();
const hodController = require('../controllers/hod.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(requireRole('HOD'));

router.get('/departments/:department_id/faculty', hodController.getDepartmentFaculty);
router.get('/courses', hodController.getCourses);
router.get('/analytics', hodController.getAnalytics);

module.exports = router;
