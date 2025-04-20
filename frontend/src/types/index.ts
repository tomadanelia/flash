export type Flashcard = {
    front: string;
    back: string;
    hint?: string; // Optional hint on the frontend
    tags: ReadonlyArray<string>
  };
  
  /**
   * Represents the user's answer difficulty for a flashcard practice trial.
   */
  export enum AnswerDifficulty {
    Wrong = 0,
    Hard = 1,
    Easy = 2,
  }
  export type PracticeSession = {
    cards: Flashcard[]; // An array of Flashcard objects
    day: number;       // The current day number
  };
  export type UpdateRequest = {
  cardFront : string;
  cardBack : string;
  difficulty : AnswerDifficulty;
  }
  export type ProgressStats = {
    
        totalCards: number,
        masteredCards: number,
        bucketCounts: number[],
        averageDifficulty: number,
        cardsPracticed: number,
    
  }