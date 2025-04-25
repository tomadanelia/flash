// tests/integration/practice.test.ts
import * as practiceService from '@db/practiceService'; // Import the whole module
import request from 'supertest';
import app from '../../src/app'; // Import the Express app definition
import supabase from '@db/supabaseClient'; // Import Supabase client (configured for TEST DB)
import { PracticeCard } from '@db/practiceService'; // Import the type for clarity

// Helper function to seed flashcards (you might move this to a shared test helper file later)
// Note: Assumes 'flashcards' table is empty before seeding for simplicity in these examples
async function seedFlashcards(cards: Array<{ front_text: string, back_text: string, current_bucket: number }>) {
    // Delete existing cards to ensure a clean slate for this seed batch
    const { error: deleteError } = await supabase.from('flashcards').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (deleteError) throw new Error(`DB Error deleting cards before seed: ${deleteError.message}`);

    if (cards.length === 0) return []; // No cards to seed

    const { data, error: insertError } = await supabase
        .from('flashcards')
        .insert(cards)
        .select('id, front_text'); // Select something to confirm insert

    if (insertError) throw new Error(`DB Error seeding cards: ${insertError.message}`);
    if (!data) throw new Error('Seeding cards did not return data');
    console.log(`Seeded ${data.length} cards. First: ${data[0]?.front_text}`);
    return data; // Return seeded data if needed, e.g., IDs
}

// Helper function to set the current day
async function setSystemDay(day: number) {
    const { error } = await supabase
        .from('system_state')
        .update({ current_day: day })
        .eq('id', 1);
    if (error) throw new Error(`DB Error setting system day: ${error.message}`);
    console.log(`Set system day to ${day}`);
}

// --- Test Suite ---
describe('GET /api/practice Integration Tests', () => {
    let server: any; // To hold server instance for controlled shutdown

    // Start server before all tests in this suite
    beforeAll((done) => {
        server = app.listen(4001, () => { // Use a different port than main app/other tests if run concurrently
            console.log(`Test server started on port 4001 for practice tests`);
            done(); // Signal Jest that async setup is complete
        });
        server.on('error', (err: any) => { // Handle server start error
            console.error("Test server failed to start:", err);
            done(err);
        });
    });

    // Stop server after all tests in this suite
    afterAll((done) => {
        if (server) {
            console.log('Closing practice test server...');
            server.close((err?: Error) => { // Add error handling for close
                 if (err) {
                     console.error("Error closing test server:", err);
                     done(err);
                     return;
                 }
                 console.log("Practice test server closed.");
                 done(); // Signal Jest that async teardown is complete
            });
        } else {
            done(); // No server to close
        }
    });

    // Before each test, ensure day is reset and potentially clear cards
    beforeEach(async () => {
        try {
             await setSystemDay(0);
             // Decide if you want to clear cards before EVERY test, or just seed what's needed
             // Clearing ensures isolation but might be slower if seeding is complex.
             // Let's clear here for simplicity.
             await seedFlashcards([]); // Clear cards
        } catch (error) {
            console.error('Error during beforeEach setup:', error);
            throw error; // Fail fast if setup fails
        }
    });

    // --- Test Cases ---

    test('should return only cards in bucket 0 on day 0', async () => {
        // Arrange
        await setSystemDay(0);
        await seedFlashcards([
            { front_text: 'Card B0-1', back_text: 'Back', current_bucket: 0 },
            { front_text: 'Card B0-2', back_text: 'Back', current_bucket: 0 },
            { front_text: 'Card B1-1', back_text: 'Back', current_bucket: 1 }, // Due day 0, 2, 4...
            { front_text: 'Card B2-1', back_text: 'Back', current_bucket: 2 }, // Due day 0, 4, 8...
        ]);

        // Act
        const response = await request(app).get('/api/practice');

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.day).toBe(0);
        expect(response.body.cards).toHaveLength(4); // B0, B1, B2 are due day 0
        // Check specific cards (order might not be guaranteed by DB)
        expect(response.body.cards).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ front: 'Card B0-1' }),
                expect.objectContaining({ front: 'Card B0-2' }),
                expect.objectContaining({ front: 'Card B1-1' }),
                expect.objectContaining({ front: 'Card B2-1' }),
            ])
        );
        // Check structure of one card
        const firstCard = response.body.cards[0] as PracticeCard;
        expect(firstCard).toHaveProperty('id');
        expect(firstCard).toHaveProperty('front');
        expect(firstCard).toHaveProperty('back');
        expect(firstCard).toHaveProperty('hint');
        expect(firstCard).toHaveProperty('tags');
        expect(firstCard.id).toEqual(expect.any(String));
        expect(firstCard.tags).toEqual(expect.any(Array)); // Should be [] if seeded with null/default
    });

    test('should return bucket 0 cards on day 1 (B1 not due, B2 not due)', async () => {
        // Arrange
        await setSystemDay(1);
        await seedFlashcards([
            { front_text: 'Card B0-1', back_text: 'Back', current_bucket: 0 }, // Always due
            { front_text: 'Card B1-1', back_text: 'Back', current_bucket: 1 }, // Due day 0, 2, 4... (NOT day 1)
            { front_text: 'Card B2-1', back_text: 'Back', current_bucket: 2 }, // Due day 0, 4, 8... (NOT day 1)
        ]);

        // Act
        const response = await request(app).get('/api/practice');

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.day).toBe(1);
        expect(response.body.cards).toHaveLength(1);
        expect(response.body.cards[0].front).toBe('Card B0-1');
    });

     test('should return bucket 0 and bucket 1 cards on day 2', async () => {
        // Arrange
        await setSystemDay(2); // Day 2
        await seedFlashcards([
            { front_text: 'Card B0', back_text: 'Back', current_bucket: 0 }, // Due day 2
            { front_text: 'Card B1', back_text: 'Back', current_bucket: 1 }, // Due day 0, 2, 4... (2 % 2^1 == 0) -> YES
            { front_text: 'Card B2', back_text: 'Back', current_bucket: 2 }, // Due day 0, 4, 8... (2 % 2^2 == 2) -> NO
            { front_text: 'Card B3', back_text: 'Back', current_bucket: 3 }, // Due day 0, 8, 16... (2 % 2^3 == 2) -> NO
        ]);

        // Act
        const response = await request(app).get('/api/practice');

        // Assert
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

    test('should return bucket 0 and bucket 2 cards on day 4', async () => {
        // Arrange
        await setSystemDay(4); // Day 4
        await seedFlashcards([
            { front_text: 'Card B0', back_text: 'Back', current_bucket: 0 }, // Due day 4
            { front_text: 'Card B1', back_text: 'Back', current_bucket: 1 }, // Due day 0, 2, 4... (4 % 2^1 == 0) -> YES
            { front_text: 'Card B2', back_text: 'Back', current_bucket: 2 }, // Due day 0, 4, 8... (4 % 2^2 == 0) -> YES
            { front_text: 'Card B3', back_text: 'Back', current_bucket: 3 }, // Due day 0, 8, 16... (4 % 2^3 == 4) -> NO
        ]);

        // Act
        const response = await request(app).get('/api/practice');

        // Assert
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
        // Arrange
        await setSystemDay(1);
        await seedFlashcards([ // Only seed cards that shouldn't be due on day 1
             { front_text: 'Card B1-1', back_text: 'Back', current_bucket: 1 },
             { front_text: 'Card B2-1', back_text: 'Back', current_bucket: 2 },
        ]);

        // Act
        const response = await request(app).get('/api/practice');

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body.day).toBe(1);
        expect(response.body.cards).toEqual([]); // Expect an empty array
    });

    test('should return 500 if database query fails', async () => {
        // Arrange
        // Mock the fetchPracticeCards function JUST for this test
        const mockFetchPracticeCards = jest.spyOn(practiceService, 'fetchPracticeCards')
            .mockImplementationOnce(async () => {
                // Make the *service function* throw an error, simulating a DB failure
                console.log("Simulating DB error via mocked fetchPracticeCards");
                throw new Error("Simulated DB Error from service");
            });
    
        await setSystemDay(0); // Set a valid day (doesn't matter as the service is mocked)
    
        // Act
        // Make the API call - this will trigger handleGetPracticeCards,
        // which will call our *mocked* fetchPracticeCards
        const response = await request(app).get('/api/practice');
    
        // Assert
        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to retrieve practice session' });
    
        // Verify the mock was called
        expect(mockFetchPracticeCards).toHaveBeenCalledWith(0); // Check it was called with day 0
    
        // Restore the original implementation for other tests
        mockFetchPracticeCards.mockRestore();
    });

    

});