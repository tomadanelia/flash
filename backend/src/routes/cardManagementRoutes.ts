import { Router } from 'express';
import { handleCreateFlashcard } from '@handlers/cardManagementHandlers';
/**
 * Express cardRouter for new flashcard-related API endpoints.
 * Base path: /api/flashcards (defined when mounting in app.ts)
 */
const cardRouter = Router();
cardRouter.post('/',handleCreateFlashcard);
export default cardRouter;

