import mongoose from "mongoose";

const instanceSchema = new mongoose.Schema(
  {
    uri: String,
    method: String,
    param: String,
    attack: String,
    evidence: String
  },
  { _id: false }
);

const findingSchema = new mongoose.Schema(
  {
    scanJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScanJob",
      required: true
    },
    alertName: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
    },
    cweId: {
      type: String
    },
    description: {
      type: String
    },
    solutionText: {
      type: String
    },
    instances: {
      type: [instanceSchema],
      default: []
    },
    probableFilePaths: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

const Finding =
  mongoose.models.Finding || mongoose.model("Finding", findingSchema);

export default Finding;
