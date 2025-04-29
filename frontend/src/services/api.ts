
import axios from 'axios';
// TODO: Update types in types/index.ts to match new backend shapes
import { PracticeSession, Flashcard, ProgressStats, UpdateRequest, AnswerDifficulty } from '../types'; 

// Define expected difficulty string type based on backend API
type AnswerDifficultyString = 'Easy' | 'Hard' | 'Wrong';

// Define placeholder types for new/updated interfaces (will be properly defined in types/index.ts later)
// TODO: Define these properly in types/index.ts
type FlashcardWithId = Flashcard & { id: string }; 
type CreateCardData = { front: string; back: string; hint?: string; tags?: string[] };
type UpdateCardData = CreateCardData; // Structure is the same for update body
type NewProgressStats = any; // Placeholder for the new progress structure


const API_BASE_URL = 'http://localhost:3001/api'; // Assuming new backend runs on 3001

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Define the expected structure for the /practice endpoint response
// TODO: This type should ideally live in types/index.ts once FlashcardWithId is defined there.
type PracticeApiResponse = {
    cards: FlashcardWithId[];
    day: number;
};


const apiService = {
  /**
   * Fetches flashcards due for practice today.
   * Response includes card IDs now.
   * GET /api/practice
   */
  async fetchPracticeCards(): Promise<PracticeApiResponse> { // Updated return type promise
    try {
      // Updated generic type to reflect expected response with card IDs
      const response = await apiClient.get<PracticeApiResponse>('/practice'); 
      return response.data;
    } catch (error: any) {
      console.error('Error fetching practice cards:', error);
      throw error;
    }
  },

  /**
   * Submits the result of a practice attempt for a specific card.
   * Uses card ID and string difficulty ('Easy', 'Hard', 'Wrong').
   * POST /api/update
   */
  async submitAnswer(id: string, difficulty: AnswerDifficultyString): Promise<void> {
    try {
      // Payload matches backend expectation: { id: string, difficulty: string }
      const payload = {
        id: id,
        difficulty: difficulty,
      };
      await apiClient.post<void>('/update', payload);
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  },

  /**
   * Fetches the hint for a specific flashcard by its ID.
   * GET /api/flashcards/{id}/hint
   */
  async fetchHint(id: string): Promise<string | null> {
    try {
      // Endpoint structure using path parameter is already correct
      const response = await apiClient.get<{ hint: string | null }>(`/flashcards/${id}/hint`);
      return response.data.hint;
    } catch (error: any) {
      console.error('Error fetching hint:', error);
      // Handle 404 specifically? Might depend on desired frontend behavior
      // if (axios.isAxiosError(error) && error.response?.status === 404) {
      //   console.log(`Hint not found for card ${id}`);
      //   return null; // Or throw a specific error?
      // }
      throw error;
    }
  },

  /**
   * Fetches learning progress statistics.
   * Can optionally filter by date range.
   * GET /api/progress?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async fetchProgress(params?: { startDate?: string; endDate?: string }): Promise<NewProgressStats> { // TODO: Update return type
    try {
      // Pass optional query parameters
      const response = await apiClient.get<NewProgressStats>('/progress', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching progress:', error);
      throw error;
    }
  },

  /**
   * Advances the system's practice day counter.
   * POST /api/day/next
   */
  async advanceDay(): Promise<{ currentDay: number }> {
    try {
      // This already calls POST /api/day/next correctly.
      const response = await apiClient.post<{ message: string, currentDay: number }>('/day/next');
      return { currentDay: response.data.currentDay }; // Return only the part needed based on original type
    } catch (error: any) {
      console.error('Error advancing day:', error);
      throw error;
    }
  },

  /**
   * Creates a new flashcard.
   * POST /api/flashcards
   */
  async createCard(data: CreateCardData): Promise<FlashcardWithId> { // Using placeholder type
    try {
        // Map frontend data structure to backend expected payload
        const payload = {
            cardFront: data.front, // Required
            cardBack: data.back,   // Required
            hint: data.hint,       // Optional
            tagList: data.tags     // Optional - backend expects 'tagList'
        };
      // Make the POST request, expecting the full new card back
      const response = await apiClient.post<FlashcardWithId>('/flashcards', payload); 
      return response.data; // Return the created card data from the response
    } catch (error: any) {
      console.error('Error creating card:', error);
      throw error;
    }
  }, // <<< Added comma here

  /**
   * Updates an existing flashcard by its ID.
   * PUT /api/flashcards/{id}
   */
  async updateCard(id: string, data: UpdateCardData): Promise<FlashcardWithId> { // TODO: Update return type
      try {
        // Map frontend data keys to backend expected keys
        const payload = {
            cardFront: data.front,
            cardBack: data.back,
            hint: data.hint,        // Optional: backend handles null/undefined
            tagList: data.tags      // Optional: backend handles null/undefined
        };
        const response = await apiClient.put<FlashcardWithId>(`/flashcards/${id}`, payload);
        return response.data; // Backend returns the full updated card object
      } catch (error: any) {
        console.error(`Error updating card ${id}:`, error);
        throw error;
      }
  }
};

export default apiService;