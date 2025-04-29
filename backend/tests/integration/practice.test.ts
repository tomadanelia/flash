import * as practiceService from '@db/practiceService';
import request from 'supertest';
import app from '../../src/app';
import supabase from '@db/supabaseClient';
import { PracticeCard } from '@db/practiceService';
// Partitioned tests:
// - Day 0: All buckets due
// - Day 1: Only bucket 0 due
// - Day 2: Buckets 0 and 1 due
// - Day 4: Buckets 0, 1, 2 due
// - No due cards
// - Database failure case
//this test uses test database

async function seedFlashcards(cards: Array<{ front_text: string, back_text: string, current_bucket: number }>) {
    const { error: deleteError } = await supabase.from('flashcards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) throw new Error(`DB Error deleting cards before seed: ${deleteError.message}`);

    if (cards.length === 0) return [];

    const { data, error: insertError } = await supabase
        .from('flashcards')
        .insert(cards)
        .select('id, front_text');

    if (insertError) throw new Error(`DB Error seeding cards: ${insertError.message}`);
    if (!data) throw new Error('Seeding cards did not return data');
    console.log(`Seeded ${data.length} cards. First: ${data[0]?.front_text}`);
    return data;
}

async function setSystemDay(day: number) {
    const { error } = await supabase
        .from('system_state')
        .update({ current_day: day })
        .eq('id', 1);
    if (error) throw new Error(`DB Error setting system day: ${error.message}`);
    console.log(`Set system day to ${day}`);
}

describe('GET /api/practice Integration Tests', () => {
    beforeEach(async () => {
        try {
            await setSystemDay(0);
            await seedFlashcards([]);
        } catch (error) {
            console.error('Error during beforeEach setup:', error);
            throw error;
        }
    });

    test('should return all cards on day 0', async () => {
        await setSystemDay(0);
        await seedFlashcards([
            { front_text: 'Card B0-1', back_text: 'Back', current_bucket: 0 },
            { front_text: 'Card B0-2', back_text: 'Back', current_bucket: 0 },
            { front_text: 'Card B1-1', back_text: 'Back', current_bucket: 1 },
            { front_text: 'Card B2-1', back_text: 'Back', current_bucket: 2 },
        ]);

        const response = await request(app).get('/api/practice');

        expect(response.statusCode).toBe(200);
        expect(response.body.day).toBe(0);
        expect(response.body.cards).toHaveLength(4);
        expect(response.body.cards).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ front: 'Card B0-1' }),
                expect.objectContaining({ front: 'Card B0-2' }),
                expect.objectContaining({ front: 'Card B1-1' }),
                expect.objectContaining({ front: 'Card B2-1' }),
            ])
        );
        const firstCard = response.body.cards[0] as PracticeCard;
        expect(firstCard).toHaveProperty('id');
        expect(firstCard).toHaveProperty('front');
        expect(firstCard).toHaveProperty('back');
        expect(firstCard).toHaveProperty('hint');
        expect(firstCard).toHaveProperty('tags');
        expect(firstCard.id).toEqual(expect.any(String));
        expect(firstCard.tags).toEqual(expect.any(Array));
    });

    test('should return bucket 0 cards on day 1 (B1 not due, B2 not due)', async () => {
        await setSystemDay(1);
        await seedFlashcards([
            { front_text: 'Card B0-1', back_text: 'Back', current_bucket: 0 },
            { front_text: 'Card B1-1', back_text: 'Back', current_bucket: 1 },
            { front_text: 'Card B2-1', back_text: 'Back', current_bucket: 2 },
        ]);

        const response = await request(app).get('/api/practice');

        expect(response.statusCode).toBe(200);
        expect(response.body.day).toBe(1);
        expect(response.body.cards).toHaveLength(1);
        expect(response.body.cards[0].front).toBe('Card B0-1');
    });

    test('should return bucket 0 and bucket 1 cards on day 2', async () => {
        await setSystemDay(2);
        await seedFlashcards([
            { front_text: 'Card B0', back_text: 'Back', current_bucket: 0 },
            { front_text: 'Card B1', back_text: 'Back', current_bucket: 1 },
            { front_text: 'Card B2', back_text: 'Back', current_bucket: 2 },
            { front_text: 'Card B3', back_text: 'Back', current_bucket: 3 },
        ]);

        const response = await request(app).get('/api/practice');

        expect(response.statusCode).toBe(200);
        expect(response.body.day).toBe(2);
        expect(response.body.cards).toHaveLength(2);
        expect(response.body.cards).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ front: 'Card B0' }),
                expect.objectContaining({ front: 'Card B1' }),
            ])
        );
    });

    test('should return bucket 0, 1 and bucket 2 cards on day 4', async () => {
        await setSystemDay(4);
        await seedFlashcards([
            { front_text: 'Card B0', back_text: 'Back', current_bucket: 0 },
            { front_text: 'Card B1', back_text: 'Back', current_bucket: 1 },
            { front_text: 'Card B2', back_text: 'Back', current_bucket: 2 },
            { front_text: 'Card B3', back_text: 'Back', current_bucket: 3 },
        ]);

        const response = await request(app).get('/api/practice');

        expect(response.statusCode).toBe(200);
        expect(response.body.day).toBe(4);
        expect(response.body.cards).toHaveLength(3);
        expect(response.body.cards).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ front: 'Card B0' }),
                expect.objectContaining({ front: 'Card B1' }),
                expect.objectContaining({ front: 'Card B2' }),
            ])
        );
    });

    test('should return an empty array if no cards are due', async () => {
        await setSystemDay(1);
        await seedFlashcards([
            { front_text: 'Card B1-1', back_text: 'Back', current_bucket: 1 },
            { front_text: 'Card B2-1', back_text: 'Back', current_bucket: 2 },
        ]);

        const response = await request(app).get('/api/practice');

        expect(response.statusCode).toBe(200);
        expect(response.body.day).toBe(1);
        expect(response.body.cards).toEqual([]);
    });

    test('should return 500 if database query fails', async () => {
        const mockFetchPracticeCards = jest.spyOn(practiceService, 'fetchPracticeCards')
            .mockImplementationOnce(async () => {
                console.log("Simulating DB error via mocked fetchPracticeCards");
                throw new Error("Simulated DB Error from service");
            });

        await setSystemDay(0);

        const response = await request(app).get('/api/practice');

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to retrieve practice session' });
        expect(mockFetchPracticeCards).toHaveBeenCalledWith(0);

        mockFetchPracticeCards.mockRestore();
    });
});
