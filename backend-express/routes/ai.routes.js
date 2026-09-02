import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.middleware.js';
import { suggest, chat } from '../controllers/ai.controller.js';

const router = Router();

// Gemini's free tier has a modest quota — keep per-user usage sane.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { success: false, message: 'Too many AI requests. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip
});

router.use(protect, aiLimiter);
router.post('/suggest', suggest);
router.post('/chat', chat);

export default router;
