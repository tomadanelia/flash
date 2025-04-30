// frontend/src/components/FlashcardDisplay.tsx

import React, { useState } from "react";
// Ensure Flashcard type is imported from the updated types file, which includes 'id'
import { Flashcard } from "../types";
// Assuming apiService is updated according to Phase 4, Chunk 4.1
import apiService from "../services/api";
// Import CSS Modules
import styles from "./FlashcardDisplay.module.css";

interface Props {
  // The card prop now expects a Flashcard object containing the 'id'
  card: Flashcard;
  showBack: boolean;
}

const FlashcardDisplay: React.FC<Props> = ({ card, showBack }) => {
  // State for storing the fetched hint (can be string or null)
  const [hint, setHint] = useState<string | null>(null);
  // State for loading indicator while fetching hint
  const [loadingHint, setLoadingHint] = useState(false);
  // State for storing potential errors during hint fetch
  const [hintError, setHintError] = useState<string | null>(null);

  /**
   * Fetches the hint for the current card using its ID.
   * Updates component state based on the API response.
   */
  async function handleGetHint(): Promise<void> {
    // Defensive check: ensure card and card.id are available
    if (!card || !card.id) {
      console.error("Cannot fetch hint: Card or Card ID is missing.");
      setHintError("Cannot fetch hint: Card data incomplete.");
      return;
    }

    setLoadingHint(true);
    setHintError(null); // Clear previous errors
    setHint(null); // Clear previous hint before fetching new one

    try {
      // --- MODIFICATION FULFILLED HERE ---
      // The card's ID (card.id) is correctly passed as an argument
      // to the apiService.fetchHint function.
      const fetchedHint = await apiService.fetchHint(card.id);
      // -----------------------------------

      // Update state with the fetched hint (which could be null if no hint exists)
      setHint(fetchedHint);
    } catch (error: any) {
      console.error(`Error fetching hint for card ${card.id}:`, error);
      // Set a user-friendly error message
      setHintError("Failed to load hint.");
    } finally {
      setLoadingHint(false);
    }
  }

  // Determine if the "Get Hint" button should be shown.
  const showHintButton = !showBack && hint === null && !hintError;

  return (
    <div className={styles["flashcard-container"]}>
      {/* Display Card Front or Back */}
      <div className={styles["card-content"]}>
        {!showBack ? card.front : card.back || "???"}
      </div>

      {/* Hint Button Area */}
      {showHintButton && (
        <div className={styles["hint-controls"]}> {/* Optional wrapper div */}
            <button
              onClick={handleGetHint}
              disabled={loadingHint}
              className={styles["hint-button"]} // Use a specific class if needed
            >
              {loadingHint ? "Loading Hint..." : "Get Hint"}
            </button>
        </div>
      )}

      {/* Display Hint Text (if fetched successfully and is not null/empty) */}
      {hint && !hintError && (
        <p className={styles["hint-text"]}> {/* Use a specific class if needed */}
          Hint: {hint}
        </p>
      )}

      {/* Display Error Message (if hint fetch failed) */}
      {hintError && (
        <p className={styles["error"]}>{hintError}</p>
      )}
    </div>
  );
};

export default FlashcardDisplay;