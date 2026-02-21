import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
    {
        scanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ScanJob",
            required: true,
            index: true,
        },
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
    { timestamps: true }
);

const Recommendation =
    mongoose.models.Recommendation ||
    mongoose.model("Recommendation", recommendationSchema);

export default Recommendation;
