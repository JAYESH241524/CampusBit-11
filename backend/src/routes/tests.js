import express from 'express';
import { 
  createTest, 
  getAvailableTests, 
  startTestAttempt, 
  saveProgress, 
  logTabSwitch, 
  submitTest,
  getAllTests,
  getTestQuestions,
  addQuestionToTest,
  deleteTest
} from '../controllers/tests.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, requireRole(['SUPER_ADMIN']), createTest);
router.get('/all', authenticate, requireRole(['SUPER_ADMIN']), getAllTests);
router.get('/:testId/questions', authenticate, requireRole(['SUPER_ADMIN']), getTestQuestions);
router.post('/:testId/questions', authenticate, requireRole(['SUPER_ADMIN']), addQuestionToTest);
router.delete('/:testId', authenticate, requireRole(['SUPER_ADMIN']), deleteTest);

router.get('/', authenticate, requireRole(['STUDENT']), getAvailableTests);
router.post('/:testId/start', authenticate, requireRole(['STUDENT']), startTestAttempt);
router.post('/:testId/save', authenticate, requireRole(['STUDENT']), saveProgress);
router.post('/:testId/tab-switch', authenticate, requireRole(['STUDENT']), logTabSwitch);
router.post('/:testId/submit', authenticate, requireRole(['STUDENT']), submitTest);

export default router;

