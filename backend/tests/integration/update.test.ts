
import request from 'supertest';
import app from '../../src/app';
import supabase from '@db/supabaseClient';
import { AnswerDifficultyType } from '@utils/learningLogic';

// --- Helper Functions ---

async function seedSingleFlashcard(cardData: { front_text: string, back_text: string, current_bucket: number }): Promise<string> {
    await supabase.from('flashcards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('practice_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data, error } = await supabase
        .from('flashcards')
        .insert(cardData)
        .select('id')
        .single();

    if (error) throw new Error(`DB Error seeding single card: ${error.message}`);
    if (!data || !data.id) throw new Error('Seeding single card failed to return ID.');
    return data.id;
}

async function getFlashcardById(id: string): Promise<{ current_bucket: number } | null> {
    const { data, error } = await supabase
        .from('flashcards')
        .select('current_bucket')
        .eq('id', id)
        .maybeSingle();

    if (error) throw new Error(`DB Error fetching card by ID ${id}: ${error.message}`);
    return data;
}

async function getLatestHistory(cardId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('practice_history')
        .select('*')
        .eq('flashcard_id', cardId)
        .order('practiced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(`DB Error fetching history for card ID ${cardId}: ${error.message}`);
    return data;
}

// --- Test Suite ---

describe('POST /api/update Integration Tests', () => {
    let server: any;
    const testCardBase = { front_text: 'Update Test', back_text: 'Back' };
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    beforeAll((done) => {
        server = app.listen(4002, () => {
            console.log('Test server started on port 4002 for update tests');
            done();
        });
        server.on('error', (err: any) => { done(err); });
    });

    afterAll((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    beforeEach(async () => {
        await supabase.from('practice_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    });

    // --- Success Cases ---

    test.each([
        [0, 'Easy', 1],
        [3, 'Easy', 4],
        [1, 'Hard', 0],
        [0, 'Hard', 0],
        [5, 'Hard', 4],
        [5, 'Wrong', 0],
        [0, 'Wrong', 0],
    ])('should update bucket from %i  for difficulty "%s" to %i and log history',
    async (initialBucket, difficulty, expectedNewBucket) => {
        const cardId = await seedSingleFlashcard({ ...testCardBase, current_bucket: initialBucket });

        const response = await request(app)
            .post('/api/update')
            .send({ id: cardId, difficulty: difficulty as AnswerDifficultyType });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: "Card updated successfully" });

        const updatedCard = await getFlashcardById(cardId);
        expect(updatedCard).not.toBeNull();
        expect(updatedCard?.current_bucket).toBe(expectedNewBucket);

        const history = await getLatestHistory(cardId);
        expect(history).not.toBeNull();
        expect(history?.flashcard_id).toBe(cardId);
        expect(history?.difficulty).toBe(difficulty);
        expect(history?.bucket_before).toBe(initialBucket);
        expect(history?.bucket_after).toBe(expectedNewBucket);
        expect(history?.practiced_at).toBeDefined();
    });

    // --- Error Cases ---

    test('should return 404 if card ID does not exist', async () => {
        await seedSingleFlashcard({ ...testCardBase, current_bucket: 0 });

        const response = await request(app)
            .post('/api/update')
            .send({ id: validUUID, difficulty: 'Easy' });

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({ error: "Flashcard not found" });
    });

    test('should return 400 if difficulty is invalid', async () => {
        const cardId = await seedSingleFlashcard({ ...testCardBase, current_bucket: 0 });

        const response = await request(app)
            .post('/api/update')
            .send({ id: cardId, difficulty: 'Maybe?' });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid Input");
        expect(response.body.message).toContain("Invalid or missing difficulty value");
    });

    test('should return 400 if card ID format is invalid', async () => {
        const response = await request(app)
            .post('/api/update')
            .send({ id: 'not-a-uuid', difficulty: 'Easy' });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid Input");
        expect(response.body.message).toContain("Invalid or missing card ID format");
    });

    test('should return 400 if card ID is missing', async () => {
        const response = await request(app)
            .post('/api/update')
            .send({ difficulty: 'Easy' });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid Input");
        expect(response.body.message).toContain("Invalid or missing card ID format");
    });

    test('should return 400 if difficulty is missing', async () => {
        const cardId = await seedSingleFlashcard({ ...testCardBase, current_bucket: 0 });

        const response = await request(app)
            .post('/api/update')
            .send({ id: cardId });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid Input");
        expect(response.body.message).toContain("Invalid or missing difficulty value");
    });
});
