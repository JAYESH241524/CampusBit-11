import express from 'express';
import { 
  createEvent, 
  getEventsFeed, 
  toggleLikeEvent, 
  getEventComments, 
  addEventComment, 
  editEventComment, 
  deleteEventComment 
} from '../controllers/events.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, requireRole(['INSTITUTE_ADMIN']), createEvent);
router.get('/', authenticate, getEventsFeed);
router.post('/:eventId/like', authenticate, requireRole(['STUDENT']), toggleLikeEvent);
router.get('/:eventId/comments', authenticate, getEventComments);
router.post('/:eventId/comments', authenticate, requireRole(['STUDENT']), addEventComment);
router.put('/comments/:commentId', authenticate, requireRole(['STUDENT']), editEventComment);
router.delete('/comments/:commentId', authenticate, requireRole(['STUDENT', 'INSTITUTE_ADMIN']), deleteEventComment);

export default router;
