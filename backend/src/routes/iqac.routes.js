const express = require('express');
const router = express.Router();
const iqacController = require('../controllers/iqac.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(requireRole('IQAC'));

router.get('/schools', iqacController.getSchools);
router.get('/departments', iqacController.getDepartments);
router.get('/courses', iqacController.getCourses);
router.get('/analytics', iqacController.getAnalytics);
router.get('/workflow-stages', iqacController.getWorkflowStages);
router.post('/workflow-stage/:stage_id/open', iqacController.openWorkflowStage);
router.post('/workflow-stage/:stage_id/close', iqacController.closeWorkflowStage);

module.exports = router;
