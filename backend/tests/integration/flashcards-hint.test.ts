/**
 * Integration tests for the GET /api/flashcards/:id/hint endpoint.
 * 
 * Strategy:
 * - Use Supabase to seed and clear test data before/after each test.
 * - Spin up a dedicated server instance for this suite on a test port.
 * - Partition tests to cover:
 *   1. Existing flashcard with a hint
 *   2. Existing flashcard without a hint
 *   3. Non-existent flashcard (valid UUID, no match)
 */

import request from 'supertest';
import app from '../../src/app';
import supabase from '@db/supabaseClient';
import { Flashcard } from '@db/cardManagementService';

async function clearFlashcardsTable() {
    const { error } = await supabase.from('flashcards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error("Error clearing flashcards table:", error.message);
}

async function seedSingleCardReturnFull(cardData: { front_text: string, back_text: string, hint_text?: string | null, tags?: string[] | null, current_bucket?: number }): Promise<Flashcard> {
    await clearFlashcardsTable(); 
    const insertPayload = {
        front_text: cardData.front_text,
        back_text: cardData.back_text,
        hint_text: cardData.hint_text ?? null,
        tags: cardData.tags ?? [],
        current_bucket: cardData.current_bucket ?? 0
    };

    const { data, error } = await supabase
        .from('flashcards')
        .insert(insertPayload)
        .select('*')
        .single();

    if (error) throw new Error(`DB Error seeding card: ${error.message}`);
    if (!data) throw new Error('Seeding card failed to return data');
    console.log(`Seeded card ID ${data.id} for hint test.`);

    const flashcard: Flashcard = {
        id: data.id,
        front: data.front_text,
        back: data.back_text,
        hint: data.hint_text,
        tags: data.tags ?? [],
        current_bucket: data.current_bucket,
        created_at: data.created_at,
        updated_at: data.updated_at,
    };
    return flashcard;
}

async function getFlashcardFromDb(cardId: string): Promise<any | null> {
    const { data, error } = await supabase.from('flashcards').select('*').eq('id', cardId).maybeSingle();
    if (error) {
        console.error(`DB Error fetching card ${cardId}:`, error.message);
        return null;
    }
    return data;
}

describe('GET /api/flashcards/{id}/hint Integration Tests', () => {
    let server: any;

    beforeAll((done) => {
        server = app.listen(4005, () => {
            console.log(`Test server started on port 4005 for hint tests`);
            done();
        });
        server.on('error', (err: any) => { done(err); });
    });

    afterAll((done) => {
        if (server) {
            console.log('Closing hint test server...');
            server.close(done);
        } else {
            done();
        }
    });

    beforeEach(async () => {
        await clearFlashcardsTable();
    });

    test('should return 200 and the hint if the flashcard exists with a hint', async () => {
        const seededCard = await seedSingleCardReturnFull({
            front_text: 'Hint Front',
            back_text: 'Hint Back',
            hint_text: 'This is the hint',
        });
        const response = await request(app).get(`/api/flashcards/${seededCard.id}/hint`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ hint: 'This is the hint' });
    });

    test('should return 200 and null hint if the flashcard exists but has no hint', async () => {
        const seededCard = await seedSingleCardReturnFull({
            front_text: 'No Hint Front',
            back_text: 'No Hint Back',
            hint_text: null,
        });
        const response = await request(app).get(`/api/flashcards/${seededCard.id}/hint`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ hint: null });
    });

    test('should return 404 if the flashcard does not exist', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app).get(`/api/flashcards/${nonExistentId}/hint`);
        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({ error: "Flashcard not found" });
    });
});
