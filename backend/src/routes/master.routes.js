const express = require('express');
const router = express.Router();
const masterController = require('../controllers/master.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireAnyRole } = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(requireAnyRole());

router.get('/schools', masterController.getSchools);
router.get('/departments', masterController.getDepartments);
router.get('/academic-years', masterController.getAcademicYears);
router.get('/semesters', masterController.getSemesters);
router.get('/batches', masterController.getBatches);
router.get('/sections', masterController.getSections);
router.get('/courses', masterController.getCourses);

module.exports = router;
