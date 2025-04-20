import React, { useState } from "react";
import { Flashcard } from "../types";
import apiService from "../services/api";
import styles from "./FlashcardDisplay.module.css"; // Import as a CSS Modules object
interface Props {
  card: Flashcard;
  showBack: boolean;
}

const FlashcardDisplay: React.FC<Props> = ({ card, showBack }) => {
  const [hint, setHint] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  async function handleGetHint(): Promise<void> {
    setLoadingHint(true);
    setHintError(null);
    setHint(""); // Clear previous hint
    try {
      const fetchedHint = await apiService.fetchHint(card);
      setHint(fetchedHint);
    } catch (error: any) {
      console.error("Error fetching hint:", error);
      setHintError("Failed to fetch hint.");
    } finally {
      setLoadingHint(false);
    }
  }

  return (
    <div className={styles["flashcard-container"]}> 
      <div className={styles["card-content"]}>
        {!showBack ? card.front : card.back || "???"}
      </div>
      {!showBack && card.hint && !hintError && !hint && (
        <button onClick={handleGetHint} disabled={loadingHint} className={styles["hint"]}>
          {loadingHint ? "Loading Hint..." : "Get Hint"}
        </button>
      )}
      {hintError && <p className={styles["error"]}>{hintError}</p>}
      {hint && !hintError && <p className={styles["hint"]}>Hint: {hint}</p>}
    </div>
  );
};

export default FlashcardDisplay;