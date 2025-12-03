import mongoose from "mongoose";

const instanceSchema = new mongoose.Schema(
  {
    uri: String,
    method: String,
    param: String,
    attack: String,
    evidence: String,
  },
  { _id: false }
);

const findingSchema = new mongoose.Schema(
  {
    scanJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScanJob",
      required: true,
    },
    pluginId: {
      type: String,
      required: true,
      index: true,
    },
    alertName: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["Informational", "Low", "Medium", "High"],
      default: "Informational",
    },
    description: {
      type: String,
    },
    solution: {
      type: String,
    },
    instances: {
      type: [instanceSchema],
      default: [],
    },
    cweId: {
      type: String,
    },
  },
  { timestamps: true }
);

const Finding =
  mongoose.models.Finding || mongoose.model("Finding", findingSchema);

export default Finding;
