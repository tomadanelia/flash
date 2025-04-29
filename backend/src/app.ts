import 'tsconfig-paths/register';
import express, { Express,Request,Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayRouter from '@routes/dayRoutes';
import practiceRouter from '@routes/practiceRoutes';
import updateRouter from '@routes/updateRoutes';
import cardRouter from '@routes/cardManagementRoutes';


dotenv.config();

const app: Express = express();

app.use(cors());
app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Flashcard Backend!');
});
//these connect routes to routers that connect them to handlers
app.use('/api/day', dayRouter);
app.use('/api/practice', practiceRouter); 
app.use('/api/update',updateRouter);
app.use('/api/flashcars',cardRouter);
export default app;
