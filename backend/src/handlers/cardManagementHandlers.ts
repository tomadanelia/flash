// src/handlers/cardManagementHandler.ts

import { Request, Response } from 'express';
import { createFlashcard, CreateCardData, Flashcard } from '@db/cardManagementServise';

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
        
        res.status(400).json({ error: "Validation Error", message: "Optional field 'tagList' must be an array of strings or null." });
        return;
    }

    const cardData: CreateCardData = {
        front: cardFront.trim(),
        back: cardBack.trim(),
        hint: hint ? hint.trim() : hint,
        tags: tags
    };

    try {
        const newFlashcard: Flashcard = await createFlashcard(cardData);
        res.status(201).json(newFlashcard);
    } catch (error: any) {
        console.error("Error creating flashcard:", error);
        res.status(500).json({
            error: "Failed to create flashcard",
            message: error.message || "An unexpected error occurred."
        });
    }
}
