
import { fetchCurrentDay } from "@db/dayService";
import { fetchPracticeCards, PracticeCard } from "@db/practiceService";
import { error } from "console";
import { Request,Response } from "express";
/**
 * @function handleGetPracticeCards
 * @async
 * @description Handles the HTTP request to fetch flashcards due for practice today.
 *
 * @param {Request} req - The Express request object (no specific body/params expected).
 * @param {Response} res - The Express response object used to send the HTTP response.
 * @returns {Promise<void>} Resolves when the response is sent.
 *
 * @specification
 * - Corresponds to the `GET /api/practice` API endpoint.
 * - MUST fetch the current day by calling `fetchCurrentDay` from `@db/dayService`.
 */
export async function handleGetPracticeCards(req: Request,res: Response): Promise<void> {
    try {
        const  currentDay = await fetchCurrentDay();
        const practiceCards:PracticeCard[] = await fetchPracticeCards(currentDay);
        res.status(200).json({
            cards:practiceCards,day:currentDay
        })
     } catch (fetchError: any) {
        console.error("Error in handleGetPracticeCards:", fetchError);
        res.status(500).json({
            "error": "Failed to retrieve practice session"
        });
     }
}