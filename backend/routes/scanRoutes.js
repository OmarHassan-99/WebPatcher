import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  deleteScan,
  getFindings,
  getScans,
  startZapScan,
  validateTargetAndRepoURLs,
} from "../controllers/scanController.js";

const scanRouter = express.Router();

scanRouter.use(authMiddleware);

scanRouter.post("/validateTarget&RepoURLs", validateTargetAndRepoURLs); // POST /api/scans/validateTarget&RepoURLs
scanRouter.post("/startScan", startZapScan); // POST /api/scans/startScan
scanRouter.get("/getScans", getScans); // GET /api/scans/getScans
scanRouter.delete("/:scanId", deleteScan); // DELETE /api/scans/:scanId
scanRouter.get("/:scanId/findings", getFindings); // GET /api/scans/:scanId/findings
export default scanRouter;
