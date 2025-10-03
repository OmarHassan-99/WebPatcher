import express from "express";
import auth from "../middleware/auth.js";
import {
  startScan,
  listScans,
  getScan,
  getFindings,
  
} from "../controllers/scanController.js";

const scanRouter = express.Router();

router.use(auth);

router.post("/", startScan);                 // POST /api/scans
router.get("/", listScans);                  // GET /api/scans
router.get("/:scanId", getScan);             // GET /api/scans/:scanId
router.get("/:scanId/findings", getFindings);// GET /api/scans/:scanId/findings


export default router;
