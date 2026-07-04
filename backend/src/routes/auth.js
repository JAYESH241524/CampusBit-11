import express from 'express';
import { 
  registerInstitute, 
  registerStudent, 
  login, 
  getApprovedInstitutes, 
  payRegistrationFee, 
  toggleNamePrivacy 
} from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register-institute', registerInstitute);
router.post('/register-student', registerStudent);
router.post('/login', login);
router.get('/approved-institutes', getApprovedInstitutes);
router.post('/pay', payRegistrationFee);
router.post('/privacy', authenticate, toggleNamePrivacy);

export default router;
