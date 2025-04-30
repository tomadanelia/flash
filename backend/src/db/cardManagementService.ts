
import supabase from '@db/supabaseClient'; // Will be needed for functions later

/**
 * Represents the complete structure of a flashcard object,
 * mirroring the columns in the 'flashcards' database table.
 * Includes read-only fields managed by the database (id, created_at, updated_at).
 */
export interface Flashcard {
    readonly id: string; 
    front: string;
    back: string;
    hint: string | null;
    tags: ReadonlyArray<string> | null; 
    current_bucket: number;
    readonly created_at: string; 
    readonly updated_at: string; 
}
export class NotFoundError extends Error { 
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}
/**
 * Defines the shape of the data required when creating or updating a new flashcard.
 * This is typically the data received from the API request body.
 * Excludes database-managed fields like id, current_bucket (defaults), created_at, updated_at.
 */
export interface ShortCardData {
    front: string;         
    back: string;          
    hint?: string | null;  
    tags?: ReadonlyArray<string> | null; 
}

export async function createFlashcard(data: ShortCardData): Promise<Flashcard> {
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


export async function updateFlashcard(id: string, data: ShortCardData): Promise<Flashcard> {
    const updatePayload = {
      front_text: data.front,
      back_text: data.back,
      hint_text: data.hint ?? null,
      tags: data.tags ?? [],
    };
  
    // perform the update + select(*).single()
    const { data: updatedData, error: updateError } = await supabase
      .from('flashcards')
      .update(updatePayload)
      .eq('id', id)
      .select('id, front_text, back_text, hint_text, tags, current_bucket, created_at, updated_at')
      .single();
  
    if (updateError) {
      const msg = updateError.message.toLowerCase();
      // PostgREST will often return an error when no rows match—treat that as "not found"
      if (msg.includes('no rows') || msg.includes('did not affect any rows')) {
        throw new NotFoundError(`Flashcard with ID ${id} not found.`);
      }
      // otherwise, it's a true DB failure
      throw new Error(`Database error when updating flashcard: ${updateError.message}`);
    }
  
    // In case Supabase ever returns no error but also no data
    if (!updatedData) {
      throw new NotFoundError(`Flashcard with ID ${id} not found.`);
    }
  
    return {
      id:           updatedData.id,
      front:        updatedData.front_text,
      back:         updatedData.back_text,
      hint:         updatedData.hint_text,
      tags:         updatedData.tags ?? [],
      current_bucket: updatedData.current_bucket,
      created_at:   updatedData.created_at,
      updated_at:   updatedData.updated_at,
    };
  }