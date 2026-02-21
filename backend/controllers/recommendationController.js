import {
    getRecommendationsForScan,
    getRecommendationById,
} from "../services/recommendationService.js";
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

        // The service returns a DTO-friendly format mapping directly to frontend needs
        const recommendations = await getRecommendationsForScan(scanId);

        return res.status(200).json({
            success: true,
            data: recommendations,
            count: recommendations.length,
        });
    } catch (err) {
        console.error(`[RecommendationController] Error listing recommendations:`, err);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching recommendations for the scan",
        });
    }
}

/**
 * Get a single recommendation by its ID
 */
export async function getRecommendation(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Recommendation ID format",
            });
        }

        const recommendation = await getRecommendationById(id);

        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: "Recommendation not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: recommendation,
        });
    } catch (err) {
        console.error(`[RecommendationController] Error getting recommendation:`, err);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the recommendation",
        });
    }
}
