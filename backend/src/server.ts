import express from 'express';
import cors from 'cors';
import * as logic from '@logic/algorithm';
import * as state from './state';
import { Flashcard, AnswerDifficulty } from '@logic/flashcards';
import { PracticeRecord } from './types';
import { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GET /api/practice
app.get('/api/practice', (req: Request, res: Response) => {
  try {
    const day = state.getCurrentDay();
    const bucketsMap = state.getBuckets();
    const bucketSets = logic.toBucketSets(bucketsMap);
    const cardsSet = logic.practice(bucketSets, day);
    const cardsArray = Array.from(cardsSet);
    console.log(`Found ${cardsArray.length} cards for practice on day ${day}`);
    res.json({ cards: cardsArray, day });
  } catch (error) {
    console.error('Error in /api/practice:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/update', (req: Request, res: Response): void => {
  try {
    const { cardFront, cardBack, difficulty } = req.body;

    if (!Object.values(AnswerDifficulty).includes(difficulty)) {
      res.status(400).json({ error: 'Invalid difficulty value' });
      return;
    }

    const card = state.findCard(cardFront, cardBack);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
      
    }

    const currentBuckets = state.getBuckets();
    const previousBucket = state.findCardBucket(card);
    const updatedBuckets = logic.update(currentBuckets, card, difficulty);
    state.setBuckets(updatedBuckets);
    const newBucket = state.findCardBucket(card);

    const record: PracticeRecord = {
      cardFront: card.front, // Use card.front
      cardBack: card.back,   // Use card.back
      difficulty,
      timestamp: Date.now(),
      previousBucket,
      newBucket,
    };
    state.addHistoryRecord(record);

    console.log(`Card updated. Difficulty: ${difficulty}, From: ${previousBucket} → To: ${newBucket}`);
    res.status(200).json({ message: 'Card updated successfully' });
  } catch (error) {
    console.error('Error in /api/update:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/api/hint', (req: Request, res: Response) => {
    try {
        const {cardFront,cardBack}= req.query;
        if(!cardFront || !cardBack || typeof cardBack!=='string' || typeof cardFront!=='string'){
            res.status(400).json({ error: 'Missing or invalid cardFront or cardBack' });
            return;
        }
        const card = state.findCard(cardFront, cardBack);
        if (!card) {
            res.status(404).json({ error: 'Card not found' });
            return;
            
          }
          const hint=logic.getHint(card);
          console.log(`Hint requested for card: Front - ${cardFront}, Back - ${cardBack}`);
          res.json({ hint });

    
        
    } catch (error) {
        console.error('Error in /api/hint:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/progress',(req : Request,res : Response)=>{

try {
      
    const bucketsMap = state.getBuckets();
    const bucketSets = logic.toBucketSets(bucketsMap);
    const history = state.getHistory();
    const progress = logic.computeProgress(bucketSets,history);
    res.json({progress})
    
} catch (error) {
    console.error('Error in /api/progress:', error);
        res.status(500).json({ error: 'Internal Server Error' });
}
});


app.get('/api/day/next', (req: Request, res: Response) => {
    state.incrementDay();
    const newDay = state.getCurrentDay();
    console.log(`new day is ${newDay}`);
    res.status(200).json({ message: "Day incremented successfully", newDay: newDay }); // Includes a success message
  });
  // Start Server:
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`); // Log message
  });