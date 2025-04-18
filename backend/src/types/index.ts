import { Flashcard, AnswerDifficulty, BucketMap } from '@logic/flashcards';
export interface PracticeSession {
    cards: Flashcard[];
    day: number;
  }

  export interface UpdateRequest {
    cardFront: string, cardBack: string, difficulty: AnswerDifficulty
  }
  export interface HintRequest { cardFront: string, cardBack: string }
  export interface ProgressStats {
    totalCards: number;       // Total number of flashcards across all buckets
    masteredCards: number;    // Number of flashcards in the highest bucket (mastered cards)
    bucketCounts: number[];   // Array of counts representing the number of flashcards in each bucket
  }
  export interface PracticeRecord {
    cardFront: string;          // Front of the flashcard
    cardBack: string;           // Back of the flashcard
    timestamp: number;          // Time of practice (e.g., timestamp in milliseconds)
    difficulty: AnswerDifficulty; // Difficulty of the user's answer (e.g., Wrong, Hard, Easy)
    previousBucket: number | undefined;     // The bucket number the card was in before the practice
    newBucket: number | undefined;          // The bucket number the card was moved to after the practice
  }