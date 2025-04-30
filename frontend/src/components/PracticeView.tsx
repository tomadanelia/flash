// frontend/src/components/PracticeView.tsx

import React, { useEffect, useState } from "react";
// Import updated types, including Flashcard (with ID) and AnswerDifficultyString
import { Flashcard, AnswerDifficultyString, PracticeSession } from "../types";
// Import updated apiService
import apiService from "../services/api";
// Import modified FlashcardDisplay component
import FlashcardDisplay from "./FlashcardDisplay";
// Optional: Import CSS module if you create one for PracticeView
// import styles from './PracticeView.module.css';

const PracticeView = () => {
  // State declaration using updated Flashcard type
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showBack, setShowBack] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);

  /**
   * Loads practice cards for the current day from the API.
   */
  async function loadPracticeCards() {
    setIsLoading(true);
    setError(null);
    setSessionFinished(false);
    setCurrentIndex(0);
    setShowBack(false);
    setPracticeCards([]);

    try {
      const result: PracticeSession = await apiService.fetchPracticeCards();
      if (result && result.cards && result.cards.length > 0) {
        setPracticeCards(result.cards);
        setDay(result.day);
        setSessionFinished(false);
      } else {
        setPracticeCards([]);
        setDay(result.day);
        setSessionFinished(true);
      }
    } catch (error: any) {
      console.error("Error loading practice cards:", error);
      setError("Failed to load practice cards. Please try again later.");
      setPracticeCards([]);
      setSessionFinished(true);
    } finally {
      setIsLoading(false);
    }
  }

  // Load cards on initial component mount
  useEffect(() => {
    loadPracticeCards();
  }, []);

  /**
   * Toggles the view to show the back of the current flashcard.
   */
  const handleShowBack = (): void => {
    setShowBack(true);
  };

  /**
   * Toggles the view back to show the front of the current flashcard.
   */
  const handleShowFront = (): void => {
    setShowBack(false);
  };

  /**
   * Handles submitting the user's answer for the current card.
   * <<< This function fulfills the requirement >>>
   * Passes the card's ID and the selected difficulty string to the API.
   */
  const handleAnswer = async (difficulty: AnswerDifficultyString) => {
    // --- MODIFICATION FULFILLED HERE ---
    // 1. Get the current card from state using the current index
    const currentCard = practiceCards[currentIndex];

    // 2. Guard clause: Check if currentCard and its id exist
    if (!currentCard || !currentCard.id) {
      console.error("Error submitting answer: Cannot find current card or card ID.");
      setError("An error occurred trying to submit the answer.");
      return; // Stop execution if card or id is missing
    }

    // setIsLoading(true); // Optional: Indicate processing

    try {
      // 3. Call apiService.submitAnswer
      // 4. Pass currentCard.id as the first argument
      // 5. Pass the received difficulty string as the second argument
      await apiService.submitAnswer(currentCard.id, difficulty);
      // -----------------------------------

      // Move to the next card or finish the session
      setShowBack(false); // Go back to showing the front for the next card
      if (currentIndex < practiceCards.length - 1) {
        setCurrentIndex(currentIndex + 1); // Move to the next card index
      } else {
        setSessionFinished(true); // Mark session as finished if it was the last card
      }
      setError(null); // Clear any previous errors on success
    } catch (error: any) {
      console.error("Error submitting answer:", error);
      setError("Failed to submit answer. Please try again.");
    } finally {
      // setIsLoading(false); // Optional: Re-enable buttons
    }
  };

  /**
   * Advances the practice day via the API and reloads practice cards.
   */
  const handleNextDay = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      await apiService.advanceDay(); // Call the API
      await loadPracticeCards(); // Reload cards for the new day
    } catch (error: any) {
      console.error("Error advancing day:", error);
      setError("Failed to advance to the next day.");
      setIsLoading(false);
    }
    // setIsLoading(false) is handled in loadPracticeCards finally block
  };

  // Conditional Rendering Logic
  const currentCard = practiceCards[currentIndex]; // Get current card for rendering

  return (
    <div /*className={styles.practiceContainer}*/>
      <h1>Practice Time!</h1>
      <p>Day: {day}</p>

      {isLoading && <p>Loading cards...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!isLoading && !error && sessionFinished && (
        <div>
          <h2>Session Complete!</h2>
          <p>No more cards to practice for day {day}.</p>
          <button onClick={handleNextDay} disabled={isLoading}>
            {isLoading ? "Loading..." : "Go to Next Day"}
          </button>
        </div>
      )}

      {/* Ensure currentCard exists before trying to render it */}
      {!isLoading && !sessionFinished && currentCard && (
        <div>
          <p>Card {currentIndex + 1} of {practiceCards.length}</p>

          {/* Pass the full currentCard object (including ID) to FlashcardDisplay */}
          <FlashcardDisplay card={currentCard} showBack={showBack} />

          {!showBack ? (
            <button onClick={handleShowBack}>Show Answer</button>
          ) : (
            <div>
              {/* Buttons correctly call handleAnswer with difficulty string */}
              <button onClick={() => handleAnswer('Easy')} disabled={isLoading}>Easy</button>
              <button onClick={() => handleAnswer('Hard')} disabled={isLoading}>Hard</button>
              <button onClick={() => handleAnswer('Wrong')} disabled={isLoading}>Wrong</button>
              <button onClick={handleShowFront} style={{ marginLeft: '10px' }}>Show Front</button>
            </div>
          )}
        </div>
      )}

      {/* Handle edge case where loading finished, no error, session not finished, but no current card */}
      {!isLoading && !error && !sessionFinished && !currentCard && practiceCards.length > 0 && (
           <p>Error: Inconsistent state - practice cards loaded but cannot display current card.</p>
      )}

       {/* Handle edge case where loading finished, no cards loaded */}
       {!isLoading && !error && !sessionFinished && practiceCards.length === 0 && (
           <p>No cards available for practice on day {day}.</p>
       )}
    </div>
  );
};

export default PracticeView;