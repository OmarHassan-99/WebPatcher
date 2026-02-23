import express from "express";
import authMiddleware from "../middleware/auth.js";
import { listRecommendationsByScan } from "../controllers/recommendationController.js";

const recommendationRouter = express.Router();

recommendationRouter.use(authMiddleware);

// GET /api/recommendations/scan/:scanId
recommendationRouter.get("/scan/:scanId", listRecommendationsByScan);

export default recommendationRouter;
