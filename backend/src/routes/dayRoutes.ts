import { Router } from 'express';
import { handleNextDay } from '@handlers/dayHandler';
/**
 * Express dayRouter for day-related API endpoints.
 * Base path: /api/day (defined when mounting in server.ts)
 */
const dayRouter = Router();
dayRouter.post('/next',handleNextDay);
export default dayRouter;

