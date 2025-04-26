import { Request, Response } from 'express';
import { updateFlashcardPractice, NotFoundError } from '@db/updateService';
import { AnswerDifficultyType } from '@utils/learningLogic';

function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(str);
}

function isValidDifficulty(difficulty: string): difficulty is AnswerDifficultyType {
    return ['Easy', 'Hard', 'Wrong'].includes(difficulty);
}
/**
 * @function handleUpdateCard
 * @async
 * @description Handles the HTTP request to update a flashcard's bucket after a practice attempt.
 *
 * @param {Request} req - The Express request object. Expects body: { id: string (UUID), difficulty: 'Easy'|'Hard'|'Wrong' }.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} Resolves when the response is sent..
 */
export async function handleUpdateCard(req: Request, res: Response): Promise<void> {
    const { id, difficulty } = req.body;

    if (typeof id !== 'string' || !isValidUUID(id)) {
        res.status(400).json({
            error: "Invalid Input",
            message: `Invalid or missing card ID format. Received: ${id}`
        });
        return;
    }

    if (typeof difficulty !== 'string' || !isValidDifficulty(difficulty)) {
        res.status(400).json({
            error: "Invalid Input",
            message: `Invalid or missing difficulty value. Received: ${difficulty}. Expected 'Easy', 'Hard', or 'Wrong'.`
        });
        return;
    }

    try {
        await updateFlashcardPractice(id, difficulty as AnswerDifficultyType);
        res.status(200).json({ message: "Card updated successfully" });
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ error: "Flashcard not found" });
        } else {
            res.status(500).json({ error: "Failed to process practice update" });
        }
    }
}
