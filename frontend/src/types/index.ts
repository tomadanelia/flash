// frontend/src/types/index.ts

/**
 * Represents the core structure of a flashcard used in the frontend.
 * Includes the database ID, essential for API interactions with the new backend.
 */
export type Flashcard = {
  id: string;          // Unique identifier from the database (UUID)
  front: string;       // Front text content
  back: string;        // Back text content
  hint: string | null; // Optional hint text, aligning with backend schema (can be null)
  tags: string[];      // Array of associated tags, defaults to empty array if null from backend
  // Note: Fields like current_bucket, created_at, updated_at from the backend
  // are omitted here as they are less likely needed directly in most frontend components.
};

/**
 * Represents the possible difficulty ratings submitted to the backend API.
 * Uses string literals as expected by the `POST /api/update` endpoint.
 */
export type AnswerDifficultyString = 'Easy' | 'Hard' | 'Wrong';

/**
 * Represents the data structure returned by the `GET /api/practice` endpoint.
 * Contains the cards due for practice today and the current day number.
 * Uses the updated Flashcard type which includes 'id'.
 */
export type PracticeSession = {
  cards: Flashcard[]; // Array of flashcards due today
  day: number;       // The current practice day number from the backend
};

/**
 * Represents the detailed recall accuracy statistics, returned within the ProgressStats.
 * Matches the structure within the `GET /api/progress` response.
 */
export type RecallAccuracyStats = {
  startDate: string; // ISO Date string 'YYYY-MM-DD' for the start of the period
  endDate: string;   // ISO Date string 'YYYY-MM-DD' for the end of the period
  correctCount: number; // Sum of 'Easy' + 'Hard' answers in the period
  wrongCount: number;   // Count of 'Wrong' answers in the period
  totalAttempts: number; // Total practice attempts recorded in the period
  correctPercentage: number; // Calculated percentage (correctCount / totalAttempts) * 100, 0 if totalAttempts is 0
};

/**
 * Represents the overall progress statistics returned by the `GET /api/progress` endpoint.
 * Updated to match the new backend response structure defined in Phase 3.
 */
export type ProgressStats = {
  totalCards: number; // Total number of flashcards in the system
  cardsPerBucket: { [bucket: number]: number }; // Object mapping bucket number (key) to card count (value), e.g., { 0: 15, 1: 8, 3: 2 }
  recallAccuracy: RecallAccuracyStats | null; // Recall stats for a requested date range, or null if no date range was requested or no history exists in the range
  cardsDueToday: number; // Number of cards scheduled for practice on the current day according to backend logic
};

/**
 * Represents the data needed to create a new flashcard via the API service layer.
 * Used as input for the `api.createCard` function. The service layer maps this
 * to the actual request body expected by `POST /api/flashcards` (e.g., mapping 'tags' to 'tagList').
 */
export type CreateCardData = {
  front: string;
  back: string;
  hint?: string | null; // Optional hint
  tags?: string[];      // Optional array of tags
};

/**
 * Represents the data needed to update an existing flashcard via the API service layer.
 * Used as input for the `api.updateCard` function. The service layer maps this
 * to the actual request body expected by `PUT /api/flashcards/{id}`.
 * Structure is identical to CreateCardData for the fields being updated.
 */
export type UpdateCardData = CreateCardData;

/**
 * Represents the response structure for the `GET /api/flashcards/{id}/hint` endpoint.
 */
export type HintResponse = {
  hint: string | null;
};

/**
 * Represents the response structure for the `POST /api/day/next` endpoint.
 */
export type AdvanceDayResponse = {
  message: string;     // Confirmation message (e.g., "Day incremented successfully")
  currentDay: number;  // The *new* current day number after incrementing
};

/**
 * Represents the request body structure for the `POST /api/update` endpoint.
 */
export type UpdatePracticeRequest = {
  id: string;                    // The ID of the flashcard being updated
  difficulty: AnswerDifficultyString; // The difficulty rating ('Easy', 'Hard', 'Wrong')
};

/**
 * Represents the response structure for the `POST /api/update` endpoint.
 * <<< This type is added/confirmed for completeness >>>
 */
export type UpdatePracticeResponse = {
    message: string; // Confirmation message (e.g., "Card updated successfully")
};


// --- Deprecated/Removed Types ---
// The original `UpdateRequest` type has been removed.
// The original `AnswerDifficulty` enum (numeric) is replaced by `AnswerDifficultyString` (string literal).