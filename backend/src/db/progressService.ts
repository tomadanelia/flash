// src/db/progressService.ts

import supabase from '@db/supabaseClient';

/**
 * @function getTotalCardCount
 * @async
 * @description Gets the total number of flashcards in the database.
 * @returns {Promise<number>} The total count of flashcards.
 * @throws {Error} If the database query fails.
 */
export async function getTotalCardCount(): Promise<number> {
    console.log("Fetching total card count...");
    const { count, error } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true }); // Only fetch the count

    if (error) {
        console.error("Database error fetching total card count:", error);
        throw new Error(`Database error fetching total card count: ${error.message}`);
    }

    const totalCount = count ?? 0;
    console.log("Total card count:", totalCount);
    return totalCount;
}


/**
 * @function getCardsPerBucket
 * @async
 * @description Gets the count of flashcards in each bucket.
 * @returns {Promise<{ [bucket: number]: number }>} An object mapping bucket numbers to card counts.
 * @throws {Error} If the database RPC call fails.
 */
export async function getCardsPerBucket(): Promise<{ [bucket: number]: number }> {
    console.log("Fetching card counts per bucket via RPC...");
    const { data, error } = await supabase.rpc('get_cards_per_bucket');

    if (error) {
        console.error("Database RPC error fetching cards per bucket:", error);
        throw new Error(`Database RPC error fetching cards per bucket: ${error.message}`);
    }

    const result: { [bucket: number]: number } = {};
    if (data) {
        (data as Array<{ bucket_number: number; card_count: number | string }>).forEach(row => {
            result[row.bucket_number] = Number(row.card_count);
        });
    }

    console.log("Card counts per bucket:", result);
    return result;
}


/**
 * @function getCardsDueTodayCount
 * @async
 * @description Counts how many flashcards are due for practice on a specific day.
 * @param {number} day - The current practice day number.
 * @returns {Promise<number>} The count of cards due today.
 * @throws {Error} If the database query fails.
 */
export async function getCardsDueTodayCount(day: number): Promise<number> {

    const { data, error } = await supabase.rpc('count_cards_due_today', {
        practice_day: day
    });

    if (error) {
        throw new Error(`Database RPC error: ${error.message}`);
    }

    const dueCount = Number(data ?? 0); // Defensive fallback
    return dueCount;
}





/**
 * @interface RecallStats
 * @description Structure for recall accuracy results.
 */
export interface RecallStats {
    startDate: string;
    endDate: string;
    correctCount: number;
    wrongCount: number;
    totalAttempts: number;
    correctPercentage: number;
}

/**
 * @function getRecallAccuracy
 * @async
 * @description Calculates recall accuracy within a given date range from practice history.
 * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
 * @returns {Promise<RecallStats | null>} Recall statistics or null if no history found in range.
 * @throws {Error} If the database RPC call fails.
 */
export async function getRecallAccuracy(startDate: string, endDate: string): Promise<RecallStats | null> {

    const { data, error } = await supabase.rpc('get_recall_accuracy_stats', {
        start_date: startDate,
        end_date: endDate
    });

    if (error) {
        throw new Error(`Database RPC error fetching recall accuracy: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return null;
    }

    let correctCount = 0;
    let wrongCount = 0;
    let totalAttempts = 0;

    
    (data as Array<{ difficulty: string; attempt_count: number | string }>).forEach(row => {
        const count = Number(row.attempt_count);
        totalAttempts += count;
        if (row.difficulty === 'Easy' || row.difficulty === 'Hard') {
            correctCount += count;
        } else if (row.difficulty === 'Wrong') {
            wrongCount += count;
        }
        
    });

    if (totalAttempts === 0) {
         return null; 
    }

    const correctPercentage = parseFloat(((correctCount / totalAttempts) * 100).toFixed(2)); 

    const result: RecallStats = {
        startDate,
        endDate,
        correctCount,
        wrongCount,
        totalAttempts,
        correctPercentage
    };

    return result;
}