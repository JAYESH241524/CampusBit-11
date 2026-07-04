import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  publishTestResults, 
  getTop100Leaderboard, 
  searchRankByRollNo,
  getCompletedTests
} from '../controllers/leaderboard.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter specifically for search to prevent roll number scraping
const searchRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 searches per 5 minutes
  message: { message: 'Too many search requests from this IP. Rate limit exceeded to prevent scraping.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/:testId/publish', authenticate, requireRole(['SUPER_ADMIN']), publishTestResults);
router.get('/:testId', authenticate, getTop100Leaderboard);
router.get('/:testId/search', authenticate, searchRateLimiter, searchRankByRollNo);
router.get('/completed-tests/list', authenticate, getCompletedTests);

export default router;
