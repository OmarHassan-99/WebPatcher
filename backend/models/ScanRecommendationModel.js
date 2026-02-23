import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    alert_name: { type: String, required: true },
    risk_level: { type: String, required: true },
    affected_url: { type: String, required: true },
    description: { type: String },
    reasoning: { type: String, required: true },
    vulnerable_code_example: { type: String, required: true },
    analysis: { type: String, required: true },
    root_cause: { type: String, required: true },
    suggested_fix: { type: String, required: true },
    file_type: { type: String, required: true },
  },
  { timestamps: true },
);

const scanRecommendationSchema = new mongoose.Schema(
  {
    scanJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScanJob",
      required: true,
      unique: true,
      index: true,
    },
    recommendations: {
      type: [recommendationSchema],
      default: [],
    },
  },
  { timestamps: true },
);

const ScanRecommendation =
  mongoose.models.ScanRecommendation ||
  mongoose.model("ScanRecommendation", scanRecommendationSchema);

export default ScanRecommendation;
