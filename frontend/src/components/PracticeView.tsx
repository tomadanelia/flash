import React, { useEffect, useState } from "react";
import { Flashcard, AnswerDifficulty } from "../types";
import apiService from "../services/api";
import FlashcardDisplay from "./FlashcardDisplay";
const PracticeView=()=>{
    const [practiceCards,setPracticeCards]=useState<Flashcard[]>([]);
    const [currentIndex,setCurrentIndex]=useState<number>(0);
    const [showBack,setShowBack]=useState(false);
    const [isLoading,setIsLoading]=useState(false);
    const [error, setError] = useState<string | null>(null);
    const [day,setDay]=useState(0);
    const [sessionFinished,setSessionFinished]=useState(false);
    async function loadPracticeCards() {
        setIsLoading(true);
        setError(null);
        setSessionFinished(false);
        try {
            const result = await apiService.fetchPracticeCards();
            if (result && result.cards && result.cards.length > 0) {
                setPracticeCards(result.cards);
                setDay(result.day);
              } else {
                setSessionFinished(true);
              }
        } catch (error:any) {
            console.error("Error loading practice cards:", error);
            setError("Failed to load practice cards.");
        } finally{
            setIsLoading(false);
        }
    }
    useEffect(() => {

        loadPracticeCards();
        
        }, []);
        const handleShowBack = (): void => {
            setShowBack(true);
          };
          const handleAnswer = async (difficulty: AnswerDifficulty) => {
            try {
              if (practiceCards.length > 0) {
                const currentCard = practiceCards[currentIndex];
                await apiService.submitAnswer(currentCard.front, currentCard.back, difficulty);
                setShowBack(false);
                if (currentIndex < practiceCards.length - 1) {
                    setCurrentIndex(currentIndex + 1); // Move to the next card
                  } else {
                    setSessionFinished(true); // It was the last card
                  }
              }
            } catch (error: any) {
              console.error("Error submitting answer:", error);
              setError("Failed to submit answer.");
            }
          };
          const handleNextDay = async () => {
            try {
              setIsLoading(true);
              setError(null);
              const dayResult = await apiService.advanceDay();
              setDay(dayResult.currentDay);
              await loadPracticeCards();
            } catch (error: any) {
              console.error("Error advancing day:", error);
              setError("Failed to advance to the next day.");
            } finally {
              setIsLoading(false);
            }
          };
          return (
            <div>
              <h1>Practice Time!</h1>
              <p>Day: {day}</p>
              {isLoading && <p>{"is Loading"}</p>}
              {error && <p>{error}</p>}
              {sessionFinished && (
                <div>
                  <p>Session complete</p>
                  <button onClick={handleNextDay}>Go to Next day</button>
                </div>
              )}
              {!sessionFinished && practiceCards.length > 0 && (
                <div>
                  <p>Card {currentIndex + 1} of {practiceCards.length}</p>
                  {!showBack ? (
                    <div>
                      <p>{practiceCards[currentIndex]?.front}</p>
                      <button onClick={handleShowBack}>Show Answer</button>
                    </div>
                  ) : (
                    <div>
                      <p>{practiceCards[currentIndex]?.back || "???"}</p>
                      <div>
                        <button onClick={() => handleAnswer(AnswerDifficulty.Easy)}>Easy</button>
                        <button onClick={() => handleAnswer(AnswerDifficulty.Hard)}>Hard</button>
                        <button onClick={() => handleAnswer(AnswerDifficulty.Wrong)}>Wrong</button>
                        <button onClick={() => setShowBack(false)}>Show Front</button>
                      </div>
                    </div>
                  )}
                  <FlashcardDisplay card={practiceCards[currentIndex]} showBack={showBack} />
                </div>
              )}
            </div>
          );
        }
export default PracticeView;