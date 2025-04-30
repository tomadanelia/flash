import { handleGetProgress } from "@handlers/progressHandler";
import { Router } from "express";
const progressRouter=Router();
progressRouter.get('/',handleGetProgress);
export default progressRouter;