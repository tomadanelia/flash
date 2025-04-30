// tests/integration/flashcards.test.ts
import * as cardManagementService from '@db/cardManagementService';
import request from 'supertest';
import app from '../../src/app'; // Import the Express app definition
import supabase from '@db/supabaseClient'; // Import Supabase client (configured for TEST DB)

import { ShortCardData, Flashcard } from '@db/cardManagementService'; // Import types

// Helper to clean up tables before/after tests
async function clearFlashcardsTable() {
    const { error } = await supabase.from('flashcards').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) console.error("Error clearing flashcards table:", error.message);
}

// Helper to fetch a card directly from DB for verification
async function getFlashcardFromDb(cardId: string): Promise<any | null> { // Use 'any' for flexibility or define a DB type
    const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', cardId)
        .maybeSingle();
    if (error) {
        console.error(`Error fetching card ${cardId} from DB:`, error.message);
        return null; // Return null on error for test assertions
    }
    return data;
}

// --- Test Suite ---
describe('POST /api/flashcards Integration Tests', () => {
    let server: any;

    // Start server before all tests
    beforeAll((done) => {
        server = app.listen(4003, () => { // Use a different port
            console.log(`Test server started on port 4003 for flashcards tests`);
            done();
        });
        server.on('error', (err: any) => { done(err); });
    });

    // Stop server after all tests
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

    // Clear the flashcards table before each test for isolation
    beforeEach(async () => {
        await clearFlashcardsTable();
    });

    // --- Test Cases ---

    test('should create a new flashcard with required fields only and return 201', async () => {
        // Arrange
        const newCardData= {
            cardFront: 'Test Front',
            cardBack: 'Test Back',
        };

        // Act
        const response = await request(app)
            .post('/api/flashcards')
            .send(newCardData);

        // Assert (Response)
        expect(response.statusCode).toBe(201); // Check for 201 Created status
        expect(response.body).toHaveProperty('id');
        expect(response.body.id).toEqual(expect.any(String)); // Check ID is a string (UUID format check is harder here)
        expect(response.body.front).toBe(newCardData.cardFront);
        expect(response.body.back).toBe(newCardData.cardBack);
        expect(response.body.hint).toBeNull(); // Default hint should be null
        expect(response.body.tags).toEqual([]); // Default tags should be empty array
        expect(response.body.current_bucket).toBe(0); // Default bucket
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');

        // Assert (Database State)
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
        // Arrange
        const newCardData = {
            cardFront: 'Full Card Front',
            cardBack: 'Full Card Back',
            hint: 'This is a hint',
            tags: ['tag1', 'test', 'another'],
        };

        // Act
        const response = await request(app)
            .post('/api/flashcards')
            .send(newCardData);

        // Assert (Response)
        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.front).toBe(newCardData.cardFront);
        expect(response.body.back).toBe(newCardData.cardBack);
        expect(response.body.hint).toBe(newCardData.hint);
        // Use expect.arrayContaining for tags if order doesn't matter, or toEqual if it does
        expect(response.body.tags).toEqual(expect.arrayContaining(newCardData.tags!));
        expect(response.body.tags).toHaveLength(newCardData.tags!.length);
        expect(response.body.current_bucket).toBe(0);

        // Assert (Database State)
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

    // Validation Error Cases
    test('should return 400 if cardFront is missing', async () => {
        // Arrange
        const badData = { back: 'Only Back' }; // Missing front

        // Act
        const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

        // Assert
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Validation Error");
        expect(response.body.message).toContain("cardFront is required");
    });

    test('should return 400 if cardBack is missing', async () => {
         // Arrange
         const badData = { cardFront: 'Only Front' }; // Missing back

         // Act
         const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

         // Assert
         expect(response.statusCode).toBe(400);
         expect(response.body.error).toBe("Validation Error");
         expect(response.body.message).toContain("cardBack is required");
    });

    test('should return 400 if cardFront is empty string', async () => {
         // Arrange
         const badData = { cardFront: '  ', cardBack: 'Valid Back' }; // Empty front

         // Act
         const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

         // Assert
         expect(response.statusCode).toBe(400);
         expect(response.body.error).toBe("Validation Error");
         expect(response.body.message).toContain("cardFront is required");
    });

     test('should return 400 if hint is provided but not a string or null', async () => {
         // Arrange
         const badData = { cardFront: 'Front', cardBack: 'Back', hint: 123 }; // Invalid hint type

         // Act
         const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

         // Assert
         expect(response.statusCode).toBe(400);
         expect(response.body.error).toBe("Validation Error");
         expect(response.body.message).toContain("'hint' must be a string or null");
    });

     test('should return 400 if tags is provided but not an array or null', async () => {
         // Arrange
         const badData = { cardFront: 'Front', cardBack: 'Back', tags: "not-an-array" }; // Invalid tagList type

         // Act
         const response = await request(app)
            .post('/api/flashcards')
            .send(badData);

         // Assert
         expect(response.statusCode).toBe(400);
         expect(response.body.error).toBe("Validation Error");
         expect(response.body.message).toContain("Optional field 'tags' must be an array of strings or null.");
            });

     // Optional: Test Database Error (Simulated)
     test('should return 500 if database insert fails', async () => {
        // Arrange
        const newCardData = { cardFront: 'Fail Test', cardBack: 'Back' };
    
        // Mock the createFlashcard service function JUST for this test
        const mockCreate = jest.spyOn(cardManagementService, 'createFlashcard')
            .mockImplementationOnce(async () => {
                console.log("Simulating DB error via mocked createFlashcard");
                throw new Error("Simulated DB Insert Error");
            });
    
        // Act
        const response = await request(app)
            .post('/api/flashcards')
            .send(newCardData);
    
        // Assert
        expect(response.statusCode).toBe(500); // Now it should reach the catch block
        expect(response.body.error).toBe("Failed to create flashcard");
        expect(response.body.message).toContain("Simulated DB Insert Error");
    
        // Restore mock
        mockCreate.mockRestore();
    });

});