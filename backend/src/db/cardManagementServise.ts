
import supabase from '@db/supabaseClient'; // Will be needed for functions later
import { error } from 'console';

/**
 * Represents the complete structure of a flashcard object,
 * mirroring the columns in the 'flashcards' database table.
 * Includes read-only fields managed by the database (id, created_at, updated_at).
 */
export interface Flashcard {
    readonly id: string; // UUID - Database generates this, should not be changed in code
    front: string;
    back: string;
    hint: string | null;
    tags: ReadonlyArray<string>; // Use ReadonlyArray for intent
    current_bucket: number;
    readonly created_at: string; // ISO Timestamp string - Database sets this
    readonly updated_at: string; // ISO Timestamp string - Database sets/updates this
}

/**
 * Defines the shape of the data required when creating a new flashcard.
 * This is typically the data received from the API request body.
 * Excludes database-managed fields like id, current_bucket (defaults), created_at, updated_at.
 */
export interface CreateCardData {
    front: string;         // Corresponds to front_text in DB
    back: string;          // Corresponds to back_text in DB
    hint?: string | null;  // Corresponds to hint_text in DB (optional input)
    tags?: ReadonlyArray<string> | null; // Corresponds to tags in DB (optional input)
}

export async function createFlashcard(data: CreateCardData): Promise<Flashcard> {
    const { data: insertedData, error: insertError } = await supabase
        .from('flashcards')
        .insert({
            front_text: data.front,
            back_text: data.back,
            hint_text: data.hint ?? null,  
            tags: data.tags ?? [],  
            current_bucket: 0,      
        })
        .select('id, front_text, back_text, hint_text, tags, current_bucket, created_at, updated_at')
        .single();  

    if (insertError) {
        throw new Error(`Insert error when creating a new flashcard: ${insertError.message}`);
    }

    if (!insertedData) {
        throw new Error("No data returned after inserting flashcard.");
    }

    const flashcard: Flashcard = {
        id: insertedData.id,
        front: insertedData.front_text,
        back: insertedData.back_text,
        hint: insertedData.hint_text,  
        tags: insertedData.tags ?? [],  
        current_bucket: insertedData.current_bucket,
        created_at: insertedData.created_at,
        updated_at: insertedData.updated_at,
    };

    return flashcard;
}

