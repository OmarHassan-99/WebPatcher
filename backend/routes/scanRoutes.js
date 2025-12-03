import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  validateTargetURL,
  startZapScan,
  getScans,
  getScan,
  getFindings,
} from "../controllers/scanController.js";

const scanRouter = express.Router();

scanRouter.use(authMiddleware);

scanRouter.post("/validateTargetURL", validateTargetURL); // POST /api/scans/validateTargetURL
scanRouter.post("/startScan", startZapScan); // POST /api/scans/startScan
scanRouter.get("/getScans", getScans); // GET /api/scans/getScans
scanRouter.get("/:scanId", getScan); // GET /api/scans/:scanId
scanRouter.get("/:scanId/findings", getFindings); // GET /api/scans/:scanId/findings
export default scanRouter;
