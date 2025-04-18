import { Flashcard, AnswerDifficulty, BucketMap } from '@logic/flashcards';
import { PracticeRecord
 } from './types/index';
const initialCards: Flashcard[] = [
    new Flashcard("how many times was caesar stabbed?","33","More than 20",["History"]),
    new Flashcard("what is fallout","game","not place",["gaming"]),
    new Flashcard("i^2","-1","not positive",["math"]),
    new Flashcard("what is heterochromia","different eyeballs","mutation",["biology"]),
    new Flashcard("was hannibal badass","yes","kinda",["History"]),
    new Flashcard("16 is kvadrati","256","not 76",["math"]),

];
let currentBuckets: BucketMap = new Map();
currentBuckets.set(0, new Set(initialCards));
let practiceHistory: PracticeRecord[] = [];

let currentDay: number = 0;
// State Accessors & Mutators

/**
 * Gets the current state of buckets.
 * @returns The current buckets map.
 */
export function getBuckets(): BucketMap {
    return currentBuckets;
}

/**
 * Updates the bucket state.
 * @param newBuckets - The updated bucket map.
 */
export function setBuckets(newBuckets: BucketMap): void {
    currentBuckets = newBuckets;
}

/**
 * Gets the practice history.
 * @returns Array of practice records.
 */
export function getHistory(): PracticeRecord[] {
    return practiceHistory;
}

/**
 * Adds a new record to the practice history.
 * @param record - The practice record to add.
 */
export function addHistoryRecord(record: PracticeRecord): void {
    practiceHistory.push(record);
}

/**
 * Gets the current day number.
 * @returns The current practice day.
 */
export function getCurrentDay(): number {
    return currentDay;
}

/**
 * Increments the current practice day.
 */
export function incrementDay(): void {
    currentDay++;
}
/**
 * Finds a flashcard based on its front and back text.
 * @param front - The front text of the card.
 * @param back - The back text of the card.
 * @returns The matching Flashcard, or undefined if not found.
 */
export function findCard(front: string, back: string): Flashcard | undefined {
    for (const cards of currentBuckets.values()) {
        for (const card of cards) {
            if (card.front === front && card.back === back) {
                return card;
            }
        }
    }
    return undefined;
}

/**
 * Finds which bucket a specific flashcard belongs to.
 * @param cardToFind - The flashcard to locate.
 * @returns The bucket number or undefined if the card is not found.
 */
export function findCardBucket(cardToFind: Flashcard): number | undefined {
    for (const [bucket, cards] of currentBuckets.entries()) {
        if (cards.has(cardToFind)) {
            return bucket;
        }
    }
    return undefined;
}

// Confirm initial state loading
console.log("Flashcard state initialized:", {
    currentDay,
    totalCards: initialCards.length,
    initialBuckets: [...currentBuckets.entries()],
});