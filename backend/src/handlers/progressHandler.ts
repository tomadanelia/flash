// src/handlers/progressHandler.ts

import { Request, Response } from 'express';
import { fetchCurrentDay } from '@db/dayService'; // To get current day for due count
import {
    getTotalCardCount,
    getCardsPerBucket,
    getCardsDueTodayCount,
    getRecallAccuracy,
    RecallStats // Import the type for the response structure
} from '@db/progressService';

// --- Date Validation Helper ---
// Basic YYYY-MM-DD regex check. For robust validation, consider libraries like 'date-fns' or 'dayjs'.
function isValidDateString(dateStr: any): boolean {
    if (typeof dateStr !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    // Check if the date object is valid and the components match (handles invalid dates like 2023-02-30)
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateStr;
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * @function handleGetProgress
 * @async
 * @description Handles the HTTP request to fetch learning progress statistics.
 *
 * @param {Request} req - The Express request object. May contain optional query params: `startDate`, `endDate` (YYYY-MM-DD).
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} Resolves when the response is sent.
 *
 * @specification
 * - Corresponds to `GET /api/progress`.
 * - Parses optional `startDate`, `endDate` from `req.query`.
 * - Validates date formats (YYYY-MM-DD) and ensures `startDate <= endDate`. Responds 400 if invalid.
 * - Defaults `endDate` to today if only `startDate` is provided.
 * - Fetches data using `fetchCurrentDay`, `getTotalCardCount`, `getCardsPerBucket`, `getCardsDueTodayCount`.
 * - Fetches recall accuracy using `getRecallAccuracy` ONLY if valid `startDate` is present.
 * - Assembles the final JSON response structure as defined in the spec.
 * - Responds 200 on success, 400 on validation error, 500 on service/DB error.
 * - Logs server-side errors.
 */
export async function handleGetProgress(req: Request, res: Response): Promise<void> {
    console.log('Received request for GET /api/progress', req.query);

    // 1. Extract and Validate Query Parameters
    let { startDate, endDate } = req.query;
    let recallStatsInput: { startDate: string, endDate: string } | null = null;

    // Ensure they are strings if they exist
    startDate = typeof startDate === 'string' ? startDate : undefined;
    endDate = typeof endDate === 'string' ? endDate : undefined;

    if (startDate) {
        if (!isValidDateString(startDate)) {
            res.status(400).json({ error: "Invalid query parameters", message: "Invalid startDate format. Expected YYYY-MM-DD." });
            return;
        }

        // Default endDate to today if only startDate is given
        if (!endDate) {
            endDate = getTodayDateString();
        } else {
            // Validate endDate if provided
            if (!isValidDateString(endDate)) {
                res.status(400).json({ error: "Invalid query parameters", message: "Invalid endDate format. Expected YYYY-MM-DD." });
                return;
            }
            // Validate date range
            if (new Date(startDate) > new Date(endDate)) {
                 res.status(400).json({ error: "Invalid query parameters", message: "startDate cannot be after endDate." });
                 return;
            }
        }
        // Prepare input for getRecallAccuracy
        recallStatsInput = { startDate, endDate };
    } else if (endDate) {
        // Cannot provide only endDate
        res.status(400).json({ error: "Invalid query parameters", message: "endDate cannot be provided without startDate." });
        return;
    }

    // 2. Fetch Data Concurrently
    try {
        // Prepare all async calls
        const currentDayPromise = fetchCurrentDay();
        const totalCardsPromise = getTotalCardCount();
        const cardsPerBucketPromise = getCardsPerBucket();
        // Due count depends on current day, so fetch day first or pass promise? Let's fetch day first for simplicity here.
        const currentDay = await currentDayPromise; // Await day first
        const cardsDueTodayPromise = getCardsDueTodayCount(currentDay);

        // Fetch recall accuracy only if dates are valid
        const recallAccuracyPromise: Promise<RecallStats | null> = recallStatsInput
            ? getRecallAccuracy(recallStatsInput.startDate, recallStatsInput.endDate)
            : Promise.resolve(null); // Resolve with null if no dates

        // Await all results
        const [
            // currentDay is already awaited
            totalCards,
            cardsPerBucket,
            cardsDueToday,
            recallAccuracy
        ] = await Promise.all([
            // currentDayPromise, // Already awaited
            totalCardsPromise,
            cardsPerBucketPromise,
            cardsDueTodayPromise,
            recallAccuracyPromise
        ]);

        // 3. Assemble Response
        const responsePayload = {
            totalCards: totalCards,
            cardsPerBucket: cardsPerBucket,
            recallAccuracy: recallAccuracy, // Will be null if dates weren't provided or no history
            cardsDueToday: cardsDueToday,
            // Note: Spec didn't explicitly include currentDay in the response, but it could be useful context
            // currentDay: currentDay
        };

        res.status(200).json(responsePayload);

    } catch (error: any) {
        console.error('Error occurred:', error); // Log error

        res.status(500).json({
            error: "Failed to compute progress",
            message: error.message || "An unexpected server error occurred."
        });
    }
}