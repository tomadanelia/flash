// src/handlers/cardManagementHandler.ts

import { Request, Response } from 'express';
import { createFlashcard, ShortCardData, Flashcard, updateFlashcard, NotFoundError } from '@db/cardManagementService';
import { isValidUUID } from './updateHandler';

/**
 * @function handleCreateFlashcard
 * @async
 * @description Handles the HTTP request to create a new flashcard.
 *
 * @param {Request} req - The Express request object. Expects body:
 *                        { cardFront: string, cardBack: string, hint?: string|null, tagList?: string[]|null }
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} Resolves when the response is sent.
 *
 * @specification
 * - Corresponds to `POST /api/flashcards`.
 */
export async function handleCreateFlashcard(req: Request, res: Response): Promise<void> {
    const { cardFront, cardBack, hint, tags } = req.body;

    if (!cardFront || typeof cardFront !== 'string' || cardFront.trim() === '') {
       
        res.status(400).json({ error: "Validation Error", message: "cardFront is required and cannot be empty." });
        return;
    }
    if (!cardBack || typeof cardBack !== 'string' || cardBack.trim() === '') {
       
        res.status(400).json({ error: "Validation Error", message: "cardBack is required and cannot be empty." });
        return;
    }
    if (hint !== undefined && hint !== null && typeof hint !== 'string') {
       
        res.status(400).json({ error: "Validation Error", message: "Optional field 'hint' must be a string or null." });
        return;
    }
    if (tags !== undefined && tags !== null && !Array.isArray(tags)) {
        
        res.status(400).json({ error: "Validation Error", message: "Optional field 'tags' must be an array of strings or null." });
        return;
    }

    const cardData: ShortCardData = {
        front: cardFront.trim(),
        back: cardBack.trim(),
        hint: hint ? hint.trim() : hint,
        tags: tags
    };

    try {
        const newFlashcard: Flashcard = await createFlashcard(cardData);
        res.status(201).json(newFlashcard);
    } catch (error: any) {
        res.status(500).json({
            error: "Failed to create flashcard",
            message: error.message || "An unexpected error occurred."
        });
    }
}
/**
 * @function handleUpdateFlashcard
 * @async
 * @description Handles the HTTP request to update an existing flashcard.
 *
 * @param {Request} req - The Express request object. Expects `id` in `req.params` and body matching UpdateCardData.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} Resolves when the response is sent.
 *
 * @specification
 * - Corresponds to `PUT /api/flashcards/{id}`.
 * - MUST extract `id` from `req.params.id`. Respond 400 if invalid UUID format.
 * - MUST parse `cardFront`, `cardBack`, `hint`, `tagList` (or `tags`) from `req.body`.
 */
export async function handleUpdateFlashcard(req: Request, res: Response): Promise<void> {
    console.log(`Received request for PUT /api/flashcards/${req.params.id}`);

    
    const { id } = req.params;
    if (!isValidUUID(id)) {
        console.warn('Invalid card ID format in URL parameter:', id);
        res.status(400).json({
            error: "Invalid ID Format",
            message: `Invalid card ID format in URL parameter. Received: ${id}`
        });
        return; 
    }

    
    const { cardFront, cardBack, hint, tags } = req.body;

    if (!cardFront || typeof cardFront !== 'string' || cardFront.trim() === '') {
        res.status(400).json({ error: "Validation Error", message: "cardFront is required and cannot be empty." });
        return; 
    }
    if (!cardBack || typeof cardBack !== 'string' || cardBack.trim() === '') {
        res.status(400).json({ error: "Validation Error", message: "cardBack is required and cannot be empty." });
        return; 
    }
     if (hint !== undefined && hint !== null && typeof hint !== 'string') {
         res.status(400).json({ error: "Validation Error", message: "Optional field 'hint' must be a string or null." });
         return; 
    }
    
     if (tags !== undefined && tags !== null && !Array.isArray(tags)) {
         res.status(400).json({ error: "Validation Error", message: "Optional field 'tags' must be an array of strings or null." });
         return; 
    }
    
    const updateData: ShortCardData = {
        front: cardFront.trim(),
        back: cardBack.trim(),
        hint: hint ? hint.trim() : hint,
        tags: tags  
    };

    
    try {
        
        const updatedFlashcard: Flashcard = await updateFlashcard(id, updateData);

        res.status(200).json(updatedFlashcard);

    } catch (error: any) {
       

        
        if (error instanceof NotFoundError) {
            res.status(404).json({ error: "Flashcard not found" });
        } else {
            
            res.status(500).json({
                error: "Failed to update flashcard",
                message: error.message || "An unexpected error occurred."
            });
        }
    }
}