
import { Router } from 'express';
import { handleUpdateCard } from '@handlers/updateHandler';
/**
 * express router for handling flashcard practice updates.
 * bbase path: /api/update (defined when mounting in app.ts)
 */
const updateRouter = Router();
updateRouter.post('/', handleUpdateCard);

export default updateRouter;