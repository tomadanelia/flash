// tests/integration/progress.test.ts

import request from 'supertest';
import app from '../../src/app'; // Import the Express app definition
import supabase from '@db/supabaseClient'; // Import Supabase client (configured for TEST DB)
import { Flashcard } from '@db/cardManagementService'; // Import Flashcard type if needed by helpers
import { RecallStats } from '@db/progressService'; // Import RecallStats type

// --- Helper Functions (Reuse/Adapt/Combine) ---
async function clearAllTables() {
    // Clear in reverse order of foreign key dependencies
    const tables = ['practice_history', 'flashcards', 'system_state'];

    for (const table of tables) {
        // Determine the ID to exclude (use UUID or integer based on the table)
        const idToExclude = ['system_state'].includes(table)
            ? -1 // for integer-based IDs
            : '00000000-0000-0000-0000-000000000000'; // for UUID-based IDs

        // Attempt deletion, but avoid deleting system state or non-existent IDs
        const { error } = await supabase.from(table).delete().neq('id', idToExclude);

        if (error && !error.message.includes('constraint')) { // Ignore FK constraint errors if deleting related tables
            console.warn(`Warning clearing ${table}:`, error.message);
        }
    }

    // Re-initialize system state
    const { error: insertError } = await supabase.from('system_state').insert({ id: 1, current_day: 0 });
    if (insertError && !insertError.message.includes('duplicate key')) { // Ignore if already exists
        console.error("Error initializing system_state:", insertError.message);
    }

    console.log("Cleared relevant tables and reset system state.");
}


// Seed flashcards (simplified, adapt if needed)
async function seedFlashcards(cards: Array<{ front_text: string, back_text: string, current_bucket: number }>): Promise<Flashcard[]> {
    if (cards.length === 0) return [];
    const { data, error } = await supabase.from('flashcards').insert(cards).select('*');
    if (error) throw new Error(`DB Error seeding cards: ${error.message}`);
    // Basic mapping, assumes returned data matches Flashcard structure somewhat
    return (data || []).map(row => ({
         id: row.id, front: row.front_text, back: row.back_text, hint: row.hint_text,
         tags: row.tags ?? [], current_bucket: row.current_bucket, created_at: row.created_at, updated_at: row.updated_at
    })) as Flashcard[];
}

// Seed practice history
async function seedPracticeHistory(history: Array<{ flashcard_id: string, difficulty: string, bucket_before: number, bucket_after: number, practiced_at?: string }>) {
    if (history.length === 0) return;
    // Add default practiced_at if not provided
    const historyWithDates = history.map(h => ({ ...h, practiced_at: h.practiced_at || new Date().toISOString() }));
    const { error } = await supabase.from('practice_history').insert(historyWithDates);
    if (error) throw new Error(`DB Error seeding history: ${error.message}`);
}

// Set system day
async function setSystemDay(day: number) {
    const { error } = await supabase.from('system_state').update({ current_day: day }).eq('id', 1);
    if (error) throw new Error(`DB Error setting system day: ${error.message}`);
}

// Get today's date string helper
function getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
}
function getDateStringDaysAgo(days: number): string {
     const date = new Date();
     date.setDate(date.getDate() - days);
     return date.toISOString().slice(0, 10);
}


// --- Test Suite ---
describe('GET /api/progress Integration Tests', () => {
    let server: any;

    beforeAll((done) => {
        server = app.listen(4006, () => { // Yet another port
            console.log(`Test server started on port 4006 for progress tests`);
            done();
        });
        server.on('error', (err: any) => { done(err); });
    });

    afterAll((done) => {
        if (server) {
            console.log('Closing progress test server...');
            server.close((err?: Error) => {
                 if (err) { done(err); return; }
                 done();
             });
        } else {
            done();
        }
    });

    // Clear tables before each test for isolation
    beforeEach(async () => {
        await clearAllTables();
    });

    // --- Test Cases ---

    test('should return default progress stats with no cards', async () => {
        // Arrange: DB is cleared by beforeEach, day is 0
        await setSystemDay(0);

        // Act
        const response = await request(app).get('/api/progress');

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            totalCards: 0,
            cardsPerBucket: {}, // Empty object
            recallAccuracy: null, // No date range provided
            cardsDueToday: 0
        });
    });

    test('should calculate stats correctly with some cards and no date range', async () => {
        // Arrange
        await setSystemDay(4); // Example day 4
        await seedFlashcards([
            { front_text: 'B0', back_text: 'B', current_bucket: 0 }, // Due today
            { front_text: 'B1', back_text: 'B', current_bucket: 1 }, // Due today (4 % 2 == 0)
            { front_text: 'B1-2', back_text: 'B', current_bucket: 1 }, // Due today (4 % 2 == 0)
            { front_text: 'B2', back_text: 'B', current_bucket: 2 }, // Due today (4 % 4 == 0)
            { front_text: 'B3', back_text: 'B', current_bucket: 3 }, // NOT due today (4 % 8 != 0)
        ]);

        // Act
        const response = await request(app).get('/api/progress');

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.totalCards).toBe(5);
        expect(response.body.cardsPerBucket).toEqual({
            "0": 1, // Counts are numbers
            "1": 2,
            "2": 1,
            "3": 1
        });
        expect(response.body.recallAccuracy).toBeNull();
        expect(response.body.cardsDueToday).toBe(4); // B0, B1, B1-2, B2
    });

    test('should calculate recallAccuracy correctly with date range', async () => {
        // Arrange
        await setSystemDay(5); // Day doesn't affect history query directly
        const cards = await seedFlashcards([
            { front_text: 'Card A', back_text: 'B', current_bucket: 1 },
            { front_text: 'Card B', back_text: 'B', current_bucket: 2 },
        ]);
        const cardA_id = cards[0].id;
        const cardB_id = cards[1].id;

        const today = getTodayDateString(); // e.g., 2024-08-30
        const yesterday = getDateStringDaysAgo(1); // e.g., 2024-08-29
        const twoDaysAgo = getDateStringDaysAgo(2); // e.g., 2024-08-28

        await seedPracticeHistory([
            // Inside range (yesterday to today)
            { flashcard_id: cardA_id, difficulty: 'Easy', bucket_before: 0, bucket_after: 1, practiced_at: `${yesterday}T10:00:00Z` },
            { flashcard_id: cardB_id, difficulty: 'Hard', bucket_before: 1, bucket_after: 0, practiced_at: `${yesterday}T11:00:00Z` },
            { flashcard_id: cardA_id, difficulty: 'Wrong', bucket_before: 1, bucket_after: 0, practiced_at: `${today}T09:00:00Z` },
            // Outside range (too early)
            { flashcard_id: cardB_id, difficulty: 'Easy', bucket_before: 0, bucket_after: 1, practiced_at: `${twoDaysAgo}T15:00:00Z` },
        ]);

        // Act: Query for yesterday to today
        const response = await request(app)
            .get(`/api/progress?startDate=${yesterday}&endDate=${today}`);

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.recallAccuracy).not.toBeNull();
        const accuracy = response.body.recallAccuracy as RecallStats;
        expect(accuracy.startDate).toBe(yesterday);
        expect(accuracy.endDate).toBe(today);
        expect(accuracy.correctCount).toBe(2); // 1 Easy + 1 Hard
        expect(accuracy.wrongCount).toBe(1); // 1 Wrong
        expect(accuracy.totalAttempts).toBe(3);
        expect(accuracy.correctPercentage).toBeCloseTo(66.67); // (2/3)*100
    });

     test('should calculate recallAccuracy defaulting endDate to today if only startDate is provided', async () => {
        // Arrange
        await setSystemDay(2);
        const cards = await seedFlashcards([{ front_text: 'A', back_text: 'B', current_bucket: 0 }]);
        const cardId = cards[0].id;
        const today = getTodayDateString();
        const yesterday = getDateStringDaysAgo(1);

        await seedPracticeHistory([
            { flashcard_id: cardId, difficulty: 'Easy', bucket_before: 0, bucket_after: 1, practiced_at: `${yesterday}T10:00:00Z` }, // Should be excluded if query is just for today
            { flashcard_id: cardId, difficulty: 'Wrong', bucket_before: 1, bucket_after: 0, practiced_at: `${today}T09:00:00Z` }, // Should be included
        ]);

        // Act: Query providing only startDate=today
        const response = await request(app)
            .get(`/api/progress?startDate=${today}`);

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.recallAccuracy).not.toBeNull();
        const accuracy = response.body.recallAccuracy as RecallStats;
        expect(accuracy.startDate).toBe(today);
        expect(accuracy.endDate).toBe(today); // Should default to today
        expect(accuracy.correctCount).toBe(0);
        expect(accuracy.wrongCount).toBe(1);
        expect(accuracy.totalAttempts).toBe(1);
        expect(accuracy.correctPercentage).toBe(0);
    });

     test('should return null recallAccuracy if no history exists in date range', async () => {
        // Arrange
        await setSystemDay(2);
        await seedFlashcards([{ front_text: 'A', back_text: 'B', current_bucket: 0 }]);
        const yesterday = getDateStringDaysAgo(1);
        const twoDaysAgo = getDateStringDaysAgo(2);

        // Act: Query a range with no history
        const response = await request(app)
            .get(`/api/progress?startDate=${twoDaysAgo}&endDate=${yesterday}`);

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.recallAccuracy).toBeNull();
    });

    // --- Validation Error Tests ---
    test('should return 400 if startDate format is invalid', async () => {
        const response = await request(app).get('/api/progress?startDate=2023/01/01');
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid query parameters");
        expect(response.body.message).toContain("Invalid startDate format");
    });

    test('should return 400 if endDate format is invalid', async () => {
        const response = await request(app).get('/api/progress?startDate=2023-01-01&endDate=tomorrow');
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid query parameters");
        expect(response.body.message).toContain("Invalid endDate format");
    });

    test('should return 400 if startDate is after endDate', async () => {
        const response = await request(app).get('/api/progress?startDate=2023-01-10&endDate=2023-01-05');
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid query parameters");
        expect(response.body.message).toContain("startDate cannot be after endDate");
    });

    test('should return 400 if only endDate is provided', async () => {
        const response = await request(app).get('/api/progress?endDate=2023-01-10');
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid query parameters");
        expect(response.body.message).toContain("endDate cannot be provided without startDate");
    });

    it("should return 500 if a database query fails", async () => {
        // Arrange: Mock the database service to throw an error
        jest.spyOn(progressService, 'getTotalCardCount').mockImplementationOnce(() => {
            throw new Error("Simulated DB Error during count");
        });
    
        // Act: Call the API
        const response = await request(app)
            .get('/api/progress')
            .query({ startDate: '2023-01-01' });
    
        // Assert: Check that the response status is 500
        expect(response.status).toBe(500);
        expect(response.body.error).toBe("Failed to compute progress");
    });
    

});
// Need to import the service module to mock it in the 500 test
import * as progressService from '@db/progressService';