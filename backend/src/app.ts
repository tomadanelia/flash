import 'tsconfig-paths/register';
import express, { Express,Request,Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayRoutes from '@routes/dayRoutes';

dotenv.config();

const app: Express = express();

app.use(cors());
app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Flashcard Backend!');
});
app.use('/api/day', dayRoutes);

export default app;
