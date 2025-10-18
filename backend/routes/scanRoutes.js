import express from "express";
import auth from "../middleware/auth.js";
import {
  startScan,
  listScans,
  getScan,
  getFindings,
  validateTargetURL,
  ZapScan,
} from "../controllers/scanController.js";

const scanRouter = express.Router();

//scanRouter.use(auth);


scanRouter.post("/validateTargetURL", validateTargetURL); // POST /api/scans/validateTargetURL
scanRouter.post("/startScan", ZapScan); // POST /api/scans/startScan
scanRouter.get("/listScans", listScans); // GET /api/scans/listScans
scanRouter.get("/:scanId", getScan); // GET /api/scans/:scanId
scanRouter.get("/:scanId/findings", getFindings); // GET /api/scans/:scanId/findings
export default scanRouter;
