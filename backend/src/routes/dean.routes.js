const express = require('express');
const router = express.Router();
const deanController = require('../controllers/dean.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(authenticateToken);
router.use(requireRole('Dean'));

router.get('/school/:school_id/departments', deanController.getDepartments);
router.get('/analytics', deanController.getAnalytics);

module.exports = router;
