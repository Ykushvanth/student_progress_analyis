const express = require('express');
const router = express.Router();
const iqacAdminController = require('../controllers/iqac-admin.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(requireRole('IQAC'));

// Faculty Management
router.get('/faculty', iqacAdminController.getFaculty);
router.post('/faculty', iqacAdminController.createFaculty);
router.put('/faculty/:user_id', iqacAdminController.updateFaculty);
router.post('/faculty-department-assignments', iqacAdminController.createFacultyDepartmentAssignment);

// Faculty Course Assignment Management
router.get('/faculty-assignments', iqacAdminController.getFacultyAssignments);
router.post('/faculty-assignments', iqacAdminController.createFacultyAssignment);
router.post('/course-section-assignments', iqacAdminController.createCourseSectionAssignments);
router.delete('/faculty-assignments/:assignment_id', iqacAdminController.deleteFacultyAssignment);

// Student Management
router.get('/students', iqacAdminController.getStudents);
router.post('/students', iqacAdminController.createStudent);
router.put('/students/:student_id', iqacAdminController.updateStudent);

// Student Enrollment Management
router.get('/enrollments', iqacAdminController.getEnrollments);
router.post('/enrollments', iqacAdminController.createEnrollment);
router.delete('/enrollments/:enrollment_id', iqacAdminController.deleteEnrollment);

// Master Data Management
router.post('/schools', iqacAdminController.createSchool);
router.put('/schools/:school_id', iqacAdminController.updateSchool);
router.post('/departments', iqacAdminController.createDepartment);
router.put('/departments/:department_id', iqacAdminController.updateDepartment);
router.post('/courses', iqacAdminController.createCourse);
router.put('/courses/:course_id', iqacAdminController.updateCourse);
router.post('/academic-years', iqacAdminController.createAcademicYear);
router.post('/batches', iqacAdminController.createBatch);
router.post('/workflow-stages', iqacAdminController.createWorkflowStage);

module.exports = router;
