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
    return(
        <></>
    )
}
export default PracticeView;