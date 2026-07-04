import express from 'express';
import { 
  getSuperAdminAnalytics, 
  listInstitutes, 
  updateInstituteStatus, 
  getInstituteDashboard, 
  bulkAddStudents 
} from '../controllers/admin.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/analytics', authenticate, requireRole(['SUPER_ADMIN']), getSuperAdminAnalytics);
router.get('/institutes', authenticate, requireRole(['SUPER_ADMIN']), listInstitutes);
router.put('/institutes/:instituteId/status', authenticate, requireRole(['SUPER_ADMIN']), updateInstituteStatus);
router.get('/institute-dashboard', authenticate, requireRole(['INSTITUTE_ADMIN']), getInstituteDashboard);
router.post('/bulk-add-students', authenticate, requireRole(['INSTITUTE_ADMIN']), bulkAddStudents);

export default router;
