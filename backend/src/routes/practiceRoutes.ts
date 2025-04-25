import { handleGetPracticeCards } from "@handlers/practiceHandler";
import { Router } from "express";
const practiceRouter=Router();
practiceRouter.get('/',handleGetPracticeCards);
export default practiceRouter;