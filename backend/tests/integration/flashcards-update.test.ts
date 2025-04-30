// tests/integration/flashcards-update.test.ts
// Integration tests for PUT /api/flashcards/{id} endpoint to validate update behavior, including success and error scenarios.

import request from 'supertest';
import app from '../../src/app';
import supabase from '@db/supabaseClient';
import { ShortCardData, Flashcard, NotFoundError } from '@db/cardManagementService';
import * as cardManagementService from '@db/cardManagementService';

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

    if (error) throw new Error(`DB Error seeding single card: ${error.message}`);
    if (!data) throw new Error('Seeding single card failed to return data.');

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
    console.log(`Seeded card ID ${flashcard.id} for update test.`);
    return flashcard;
}

async function getFlashcardFromDb(cardId: string): Promise<any | null> {
    const { data, error } = await supabase.from('flashcards').select('*').eq('id', cardId).maybeSingle();
    if (error) { console.error(`DB Error fetching card ${cardId}:`, error.message); return null; }
    return data;
}

describe('PUT /api/flashcards/{id} Integration Tests', () => {
    let server: any;
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    beforeAll((done) => {
        server = app.listen(4004, () => {
            console.log(`Test server started on port 4004 for flashcard update tests`);
            done();
        });
        server.on('error', (err: any) => { done(err); });
    });

    afterAll((done) => {
        if (server) {
            server.close((err?: Error) => {
                 if (err) { done(err); return; }
                 console.log("Flashcard update test server closed.");
                 done();
             });
        } else {
            done();
        }
    });

    beforeEach(async () => {
        await clearFlashcardsTable();
    });

    test('should update an existing flashcard successfully and return 200', async () => {
        const initialCardData = { front_text: 'Initial Front', back_text: 'Initial Back', hint_text: 'Old Hint', tags: ['initial'] };
        const seededCard = await seedSingleCardReturnFull(initialCardData);
        const cardId = seededCard.id;

        const updatePayload = {
            cardFront: 'Updated Front',
            cardBack: 'Updated Back',
            hint: 'New Hint',
            tags: ['updated', 'tag']
        };

        const response = await request(app)
            .put(`/api/flashcards/${cardId}`)
            .send(updatePayload);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('id', cardId);
        expect(response.body.front).toBe(updatePayload.cardFront);
        expect(response.body.back).toBe(updatePayload.cardBack);
        expect(response.body.hint).toBe(updatePayload.hint);
        expect(response.body.tags).toEqual(expect.arrayContaining(updatePayload.tags));
        expect(response.body.tags).toHaveLength(updatePayload.tags.length);
        expect(response.body.current_bucket).toBe(seededCard.current_bucket);
        expect(response.body.created_at).toBe(seededCard.created_at);
        expect(response.body.updated_at).not.toBe(seededCard.updated_at);
        expect(new Date(response.body.updated_at) > new Date(seededCard.updated_at)).toBe(true);

        const dbCard = await getFlashcardFromDb(cardId);
        expect(dbCard).not.toBeNull();
        expect(dbCard.front_text).toBe(updatePayload.cardFront);
        expect(dbCard.back_text).toBe(updatePayload.cardBack);
        expect(dbCard.hint_text).toBe(updatePayload.hint);
        expect(dbCard.tags).toEqual(expect.arrayContaining(updatePayload.tags));
        expect(dbCard.current_bucket).toBe(seededCard.current_bucket);
        expect(new Date(dbCard.updated_at) > new Date(seededCard.updated_at)).toBe(true);
    });

    test('should update an existing flashcard setting optional fields to null/empty', async () => {
        const initialCardData = { front_text: 'Initial Front', back_text: 'Initial Back', hint_text: 'Old Hint', tags: ['initial'] };
        const seededCard = await seedSingleCardReturnFull(initialCardData);
        const cardId = seededCard.id;

        const updatePayload = {
            cardFront: 'Updated Front Nulls',
            cardBack: 'Updated Back Nulls',
            hint: null,
            tags: []
        };

        const response = await request(app)
            .put(`/api/flashcards/${cardId}`)
            .send(updatePayload);

        expect(response.statusCode).toBe(200);
        expect(response.body.front).toBe(updatePayload.cardFront);
        expect(response.body.back).toBe(updatePayload.cardBack);
        expect(response.body.hint).toBeNull();
        expect(response.body.tags).toEqual([]);

        const dbCard = await getFlashcardFromDb(cardId);
        expect(dbCard).not.toBeNull();
        expect(dbCard.hint_text).toBeNull();
        expect(dbCard.tags).toEqual([]);
    });

            test('should return 500 if trying to update a non-existent card ID', async () => {
        const updatePayload = { cardFront: 'Update Fail', cardBack: 'Back' };

        const response = await request(app)
            .put(`/api/flashcards/${validUUID}`)
            .send(updatePayload);

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe("Failed to update flashcard");
        expect(response.body.message).toContain("Database error when updating flashcard");
    });
    });

    test('should return 400 if card ID in URL is not a valid UUID format', async () => {
        const updatePayload = { cardFront: 'Update Fail', cardBack: 'Back' };

        const response = await request(app)
            .put(`/api/flashcards/not-a-uuid`)
            .send(updatePayload);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid ID Format");
        expect(response.body.message).toContain("Invalid card ID format in URL parameter");
    });

    test('should return 400 if cardFront is missing in body', async () => {
        const seededCard = await seedSingleCardReturnFull({ front_text: 'Initial', back_text: 'Initial' });
        const cardId = seededCard.id;
        const badData = { cardBack: 'Only Back' };

        const response = await request(app).put(`/api/flashcards/${cardId}`).send(badData);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Validation Error");
        expect(response.body.message).toContain("cardFront is required");
    });

    test('should return 400 if cardBack is missing in body', async () => {
        const seededCard = await seedSingleCardReturnFull({ front_text: 'Initial', back_text: 'Initial' });
        const cardId = seededCard.id;
        const badData = { cardFront: 'Only Front' };

        const response = await request(app).put(`/api/flashcards/${cardId}`).send(badData);

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Validation Error");
        expect(response.body.message).toContain("cardBack is required");
    });

    test('should return 500 if database update fails', async () => {
        const seededCard = await seedSingleCardReturnFull({ front_text: 'Initial', back_text: 'Initial' });
        const cardId = seededCard.id;
        const updatePayload = { cardFront: 'DB Fail Update', cardBack: 'Back' };

        const mockUpdate = jest.spyOn(supabase, 'from')
            .mockImplementationOnce(() => ({
                update: jest.fn().mockImplementationOnce(() => ({
                     eq: jest.fn().mockImplementationOnce(() => ({
                         select: jest.fn().mockImplementationOnce(() => ({
                             single: jest.fn().mockResolvedValue({ data: null, error: new Error("Simulated DB Update Error") })
                         }))
                     }))
                 }))
             }) as any);

        const response = await request(app)
            .put(`/api/flashcards/${cardId}`)
            .send(updatePayload);

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe("Failed to update flashcard");
        expect(response.body.message).toContain("Simulated DB Update Error");

        mockUpdate.mockRestore();
    });
