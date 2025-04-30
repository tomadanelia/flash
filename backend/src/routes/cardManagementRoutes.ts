import { Router } from 'express';
import { handleCreateFlashcard, handleUpdateFlashcard } from '@handlers/cardManagementHandlers';
/**
 * Express cardRouter for new flashcard-related API endpoints.
 * Base path: /api/flashcards (defined when mounting in app.ts)
 * cardupdateRouter for /api/flashcards/:id
 */
const cardRouter = Router();
cardRouter.post('/', handleCreateFlashcard);
cardRouter.put('/:id', handleUpdateFlashcard);
export default cardRouter;
