import 'tsconfig-paths/register';
import express, { Express,Request,Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayRouter from '@routes/dayRoutes';
import practiceRouter from '@routes/practiceRoutes';
import updateRouter from '@routes/updateRoutes';
import cardRouter from '@routes/cardManagementRoutes';
import progressRouter from '@routes/progressRoutes';


dotenv.config();

const app: Express = express();
const allowedOrigins = [
  'http://localhost:5173', 
  'https://flash-8hdo.onrender.com' 
];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Flashcard Backend!');
});
app.use('/api/day', dayRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/update',updateRouter);
app.use('/api/flashcards',cardRouter);
app.use('/api/progress',progressRouter);
export default app;
