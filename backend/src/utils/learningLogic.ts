export type AnswerDifficultyType = 'Easy' | 'Hard' | 'Wrong';
/**
 * Calculates the next bucket number based on the current bucket and difficulty.
 * Rules: Easy: +1, Hard: max(0, current - 1), Wrong: 0
 *
 * @param {number} currentBucket - The bucket number the card is currently in (non-negative integer).
 * @param {AnswerDifficultyType} difficulty - The user's answer rating.
 * @returns {number} The calculated next bucket number.
 */

export function calculateNewBucket(currentBucket: number, difficulty: AnswerDifficultyType): number {
    if (currentBucket < 0) {
        console.warn(`calculateNewBucket called with negative currentBucket: ${currentBucket}. Treating as 0.`);
        currentBucket = 0;
   }
   let newBucket;
    if(difficulty=='Easy'){
    newBucket=currentBucket+1;
   }
   else if(difficulty=='Hard'){
    newBucket=Math.max(0,currentBucket-1);
   }
   else{
    newBucket=0;   }
    return newBucket;
}