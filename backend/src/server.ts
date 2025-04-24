
import 'tsconfig-paths/register';

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dayRoutes from '@routes/dayRoutes';


dotenv.config();

// Initializing the Express application
const app: Express = express();
export {app};
// Defining the port the server will listen on
// Using PORT from .env file, or default to 3001 if not specified
const PORT = process.env.PORT || 3001;

// --- Global Middleware ---

// Enable Cross-Origin Resource Sharing (CORS) for all origins
// Allows your frontend (running on a different port) to talk to this backend
app.use(cors());

// Enable parsing of incoming JSON request bodies
// Populates req.body for routes handling JSON payloads
app.use(express.json());

// --- Basic Test Route ---

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Flashcard Backend!');
});

// --- API Routes (Placeholder - Will be added later) ---
app.use('/api/day', dayRoutes);
// Example: app.use('/api/practice', practiceRoutes);

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});