import supabase from '@db/supabaseClient';
import { calculateNewBucket, AnswerDifficultyType } from '@utils/learningLogic';
export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}
/**
 * Updates a flashcard's practice state by:
 * - Fetching its current bucket
 * - Calculating and updating the new bucket
 * - Inserting a practice history record
 *
 * @param {string} cardId - The ID of the flashcard to update.
 * @param {AnswerDifficultyType} difficulty - The difficulty rating of the user's answer.
 * @throws {NotFoundError} If the flashcard is not found.
 * @throws {Error} If a database error occurs during update or insert.
 */
export async function updateFlashcardPractice(
    cardId: string,
    difficulty: AnswerDifficultyType
): Promise<void> {
    
    const { data, error } = await supabase
    .from('flashcards')
    .select('current_bucket')
    .eq('id', cardId)
    .single();

    if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST123') {
            // Supabase "No rows" error codes
            throw new NotFoundError(`Flashcard with id ${cardId} not found`);
        }
        throw new Error('Database error while fetching flashcard: ' + error.message);
    }
    
    if (!data) {
        throw new NotFoundError(`Flashcard with id ${cardId} not found`);
    }
    const newBucket= calculateNewBucket(data.current_bucket,difficulty);
    const { error: updateError } = await supabase
        .from('flashcards')
        .update({ current_bucket: newBucket, updated_at: new Date().toISOString()  }) 
        .eq('id', cardId);

    
    if (updateError) {
       
        throw new Error(`Database error updating flashcard current_bucket: ${updateError.message}`);
    }
   
    const { error: insertError } = await supabase
    .from('practice_history')
    .insert({
        flashcard_id: cardId,          
        practiced_at: new Date().toISOString(), 
        difficulty: difficulty,                    
        bucket_before: data.current_bucket,  
        bucket_after: newBucket          
});
if (insertError) {
    throw new Error(`Database error inserting practice history: ${insertError.message}`);
}


  
}