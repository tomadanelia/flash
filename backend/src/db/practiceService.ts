
import supabase from '@db/supabaseClient';
export interface PracticeCard {
    id: string;           
    front: string;
    back: string;
    hint: string | null;
    tags: ReadonlyArray<string>;
}

/**
 * @function fetchPracticeCards
 * @async
 * @description Fetches flashcards scheduled for practice on a given day by calling the
 *              'get_practice_cards' PostgreSQL function.
 *
 * @param {number} day - The current practice day number (integer, starting from 0).
 *
 * @returns {Promise<PracticeCard[]>} A promise that resolves with an array of PracticeCard objects.
 *
 * @throws {Error} If the database RPC call fails.
 */
export async function fetchPracticeCards(day: number): Promise<PracticeCard[]> {
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_practice_cards', {
        practice_day: day
    });

    
    if (rpcError) {
        console.error('db RPC error when quering practicecards', rpcError);
        throw new Error(`db RPC error when quering practicecards ${rpcError.message}`);
    }

   
    if (!rpcData) {
        return [];
    }
    const practiceCards: PracticeCard[] = rpcData.map((row: any) => ({
        id: row.id,
        front: row.front_text, 
        back: row.back_text,   
        hint: row.hint_text,   
        tags: row.tags || [],  
    }));
    return practiceCards;
}
