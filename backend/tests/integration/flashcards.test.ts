/**
 * Integration Test Suite: Flashcard API
 * 
 * Strategy:
 * - This is a black-box integration test suite using Supertest against the Express app.
 * - Real Supabase Test DB is used (not mocked), except one simulated DB error via Jest mock.
 * 
 * Input Partitioning:
 * - Valid Inputs:
 *   - Minimum valid data (required fields only)
 *   - Fully populated data (with optional fields)
 * 
 * - Invalid Inputs:
 *   - Missing required fields (cardFront, cardBack)
 *   - Invalid types for optional fields (hint, tags)
 *   - Empty string for required field (cardFront)
 * 
 * - Exceptional Cases:
 *   - Simulated database failure during flashcard creation
 */

import * as cardManagementService from '@db/cardManagementService';
import request from 'supertest';
import app from '../../src/app';
import supabase from '@db/supabaseClient';
import { ShortCardData, Flashcard } from '@db/cardManagementService';

async function clearFlashcardsTable() {
    const { error } = await supabase.from('flashcards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error("Error clearing flashcards table:", error.message);
}

async function getFlashcardFromDb(cardId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', cardId)
        .maybeSingle();
    if (error) {
        console.error(`Error fetching card ${cardId} from DB:`, error.message);
        return null;
    }
    return data;
}

describe('POST /api/flashcards Integration Tests', () => {
    let server: any;

    beforeAll((done) => {
        server = app.listen(4003, () => {
            console.log(`Test server started on port 4003 for flashcards tests`);
            done();
        });
        server.on('error', (err: any) => { done(err); });
    });

    afterAll((done) => {
        if (server) {
            server.close((err?: Error) => {
                if (err) { done(err); return; }
                console.log("Flashcards test server closed.");
                done();
            });
        } else {
            done();
        }
    });

    beforeEach(async () => {
        await clearFlashcardsTable();
    });

    test('should create a new flashcard with required fields only and return 201', async () => {
        const newCardData = {
            cardFront: 'Test Front',
            cardBack: 'Test Back',
        };

        const response = await request(app)
            .post('/api/flashcards')
            .send(newCardData);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.id).toEqual(expect.any(String));
        expect(response.body.front).toBe(newCardData.cardFront);
        expect(response.body.back).toBe(newCardData.cardBack);
        expect(response.body.hint).toBeNull();
        expect(response.body.tags).toEqual([]);
        expect(response.body.current_bucket).toBe(0);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');

        const cardId = response.body.id;
        const dbCard = await getFlashcardFromDb(cardId);
        expect(dbCard).not.toBeNull();
        expect(dbCard.id).toBe(cardId);
        expect(dbCard.front_text).toBe(newCardData.cardFront);
        expect(dbCard.back_text).toBe(newCardData.cardBack);
        expect(dbCard.hint_text).toBeNull();
        expect(dbCard.tags).toEqual([]);
        expect(dbCard.current_bucket).toBe(0);
    });

    test('should create a new flashcard with all optional fields and return 201', async () => {
        const newCardData = {
            cardFront: 'Full Card Front',
            cardBack: 'Full Card Back',
            hint: 'This is a hint',
            tags: ['tag1', 'test', 'another'],
        };

        const response = await request(app)
            .post('/api/flashcards')
            .send(newCardData);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.front).toBe(newCardData.cardFront);
        expect(response.body.back).toBe(newCardData.cardBack);
        expect(response.body.hint).toBe(newCardData.hint);
        expect(response.body.tags).toEqual(expect.arrayContaining(newCardData.tags!));
        expect(response.body.tags).toHaveLength(newCardData.tags!.length);
        expect(response.body.current_bucket).toBe(0);

        const cardId = response.body.id;
        const dbCard = await getFlashcardFromDb(cardId);
        expect(dbCard).not.toBeNull();
        expect(dbCard.front_text).toBe(newCardData.cardFront);
        expect(dbCard.back_text).toBe(newCardData.cardBack);
        expect(dbCard.hint_text).toBe(newCardData.hint);
        expect(dbCard.tags).toEqual(expect.arrayContaining(newCardData.tags!));
        expect(dbCard.tags).toHaveLength(newCardData.tags!.length);
        expect(dbCard.current_bucket).toBe(0);
    });

    test('should return 400 if cardFront is missing', async () => {
        const badData = { back: 'Only Back' };

        const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Validation Error");
        expect(response.body.message).toContain("cardFront is required");
    });

    test('should return 400 if cardBack is missing', async () => {
        const badData = { cardFront: 'Only Front' };

        const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Validation Error");
        expect(response.body.message).toContain("cardBack is required");
    });

    test('should return 400 if cardFront is empty string', async () => {
        const badData = { cardFront: '  ', cardBack: 'Valid Back' };

        const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Validation Error");
        expect(response.body.message).toContain("cardFront is required");
    });

    test('should return 400 if hint is provided but not a string or null', async () => {
        const badData = { cardFront: 'Front', cardBack: 'Back', hint: 123 };

        const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Validation Error");
        expect(response.body.message).toContain("'hint' must be a string or null");
    });

    test('should return 400 if tags is provided but not an array or null', async () => {
        const badData = { cardFront: 'Front', cardBack: 'Back', tags: "not-an-array" };

        const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Validation Error");
        expect(response.body.message).toContain("Optional field 'tags' must be an array of strings or null.");
    });

    test('should return 500 if database insert fails', async () => {
        const newCardData = { cardFront: 'Fail Test', cardBack: 'Back' };

        const mockCreate = jest.spyOn(cardManagementService, 'createFlashcard')
            .mockImplementationOnce(async () => {
                console.log("Simulating DB error via mocked createFlashcard");
                throw new Error("Simulated DB Insert Error");
            });

        const response = await request(app)
            .post('/api/flashcards')
            .send(newCardData);

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe("Failed to create flashcard");
        expect(response.body.message).toContain("Simulated DB Insert Error");

        mockCreate.mockRestore();
    });

});
