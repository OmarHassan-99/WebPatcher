import { getRecommendationsForScan } from "../services/recommendationService.js";
import mongoose from "mongoose";

/**
 * Get all recommendations associated with a scan ID
 */
export async function listRecommendationsByScan(req, res) {
  try {
    const { scanId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Scan ID format",
      });
    }

    const recommendations = await getRecommendationsForScan(scanId);

    return res.status(200).json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (err) {
    console.error(
      `[RecommendationController] Error listing recommendations:`,
      err,
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching recommendations for the scan",
    });
  }
}
