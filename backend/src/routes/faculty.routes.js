const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(requireRole('Faculty'));

router.get('/assignments', facultyController.getAssignments);
router.get('/students', facultyController.getStudents);
router.post('/assignments/:assignment_id/students', facultyController.addStudentToAssignment);
router.post('/assignments/:assignment_id/students/bulk', facultyController.addStudentsBulk);
router.put('/students/:enrollment_id/initial-analysis', facultyController.updateInitialAnalysis);
router.put('/students/:enrollment_id/sessional1', facultyController.updateSessional1);
router.put('/students/:enrollment_id/sessional2', facultyController.updateSessional2);

module.exports = router;
