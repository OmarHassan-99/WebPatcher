import mongoose from "mongoose";
const scanJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetUrl: {
      type: String,
      required: true,
    },
    targetName: { type: String },
    context: {
      languages: [{ type: String }],
      frameworks: [{ type: String }],
      repoUrl: { type: String },
      branch: { type: String, default: "main" },
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "Analyzing", "Patching", "failed"],
      default: "queued",
    },
    findings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Finding",
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const ScanJob =
  mongoose.models.ScanJob || mongoose.model("ScanJob", scanJobSchema);

export default ScanJob;
