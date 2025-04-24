
import supabase from '@db/supabaseClient';

/**
 * Fetches the current practice day number from the database.
 * Assumes the system_state table exists and has a single row with id=1.
 * @returns {Promise<number>} A promise that resolves with the current day number.
 * @throws {Error} If the database query fails or the row/column is not found.
 */
export async function fetchCurrentDay(): Promise<number> {
   
    
    const { data, error } = await supabase
        .from('system_state')      
        .select('current_day')     
        .eq('id', 1)              
        .single();                 

   
    if (error) {
        console.error('Error fetching current day:', error);
        throw new Error(`Database error fetching current day: ${error.message}`);
    }

    if (!data) {
        console.error('System state row (id=1) not found!');
        throw new Error('System state row (id=1) could not be found in the database.');
    }
    return data.current_day;
}

/**
 * Increments the current practice day number in the database.
 * Fetches the current day, increments it, updates the DB, and returns the new day.
 * @returns {Promise<number>} A promise that resolves with the **new** current day number after incrementing.
 * @throws {Error} If fetching or updating the day fails.
 */
export async function incrementCurrentDay(): Promise<number> { 
   
    let currentDay: number;

    
    try {
        currentDay = await fetchCurrentDay();
    } catch (fetchError: any) {
        throw fetchError; 
    }

    
    const newDay = currentDay + 1;

    
    try {
        const { error: updateError } = await supabase
            .from('system_state')
            .update({ current_day: newDay }) 
            .eq('id', 1);

        
        if (updateError) {
            console.error('Error updating current day in database:', updateError);
            throw new Error(`Database error updating current day: ${updateError.message}`);
        }

        console.log(`Successfully incremented day to: ${newDay}`);
        return newDay; 

    } catch (updateException: any) {
        
        console.error('Unexpected exception during day update:', updateException);
        throw new Error(`Unexpected error while updating current day: ${updateException.message}`);
    }
}