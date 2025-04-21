import axios from 'axios';
import { PracticeSession, AnswerDifficulty, Flashcard, ProgressStats,UpdateRequest } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json', // Assuming your backend expects JSON
  },
  // You can add other default configurations here, like timeouts or interceptors
});

const apiService = {
  async fetchPracticeCards(): Promise<PracticeSession> {
    try {
      const response = await apiClient.get<PracticeSession>('/practice');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching practice cards:', error);
      throw error;
    }
  },
  async submitAnswer(cardFront: string, cardBack: string, difficulty: AnswerDifficulty): Promise<void> {
    try {
      const payload: UpdateRequest = {
        cardFront: cardFront,
        cardBack: cardBack,
        difficulty: difficulty,
      };
      await apiClient.post<void>('/update', payload);
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }, 
  async fetchHint(card: Flashcard): Promise<string> {
    try {
      const response = await apiClient.get<{ hint: string }>('/hint', {
        params: { cardFront: card.front, cardBack: card.back },
      });
      return response.data.hint;
    } catch (error: any) {
      console.error('Error fetching hint:', error);
      throw error;
    }
  },

  async fetchProgress(): Promise<ProgressStats> {
    try {
      const response = await apiClient.get<ProgressStats>('/progress');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching progress:', error);
      throw error;
    }
  },

  async advanceDay(): Promise<{ currentDay: number }> {
    try {
      const response = await apiClient.post<{ currentDay: number }>('/day/next');
      return response.data;
    } catch (error: any) {
      console.error('Error advancing day:', error);
      throw error;
    }
  },
};

export default apiService;
