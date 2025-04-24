import { Router } from 'express';
import { handleNextDay } from '@handlers/dayHandler';
/**
 * Express router for day-related API endpoints.
 * Base path: /api/day (defined when mounting in server.ts)
 */
const router = Router();
router.post('/next',handleNextDay);
export default router;

