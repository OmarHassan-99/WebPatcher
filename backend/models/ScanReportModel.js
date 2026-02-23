import mongoose from "mongoose";

const instanceSchema = new mongoose.Schema(
  {
    uri: String,
    method: String,
    param: String,
    attack: String,
    evidence: String,
  },
  { _id: false },
);

const findingSchema = new mongoose.Schema(
  {
    pluginId: {
      type: String,
      required: true,
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
  { _id: false },
);

const scanReportSchema = new mongoose.Schema(
  {
    scanJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScanJob",
      required: true,
      unique: true,
      index: true,
    },
    findings: {
      type: [findingSchema],
      default: [],
    },
  },
  { timestamps: true },
);

const ScanReport =
  mongoose.models.ScanReport || mongoose.model("ScanReport", scanReportSchema);

export default ScanReport;
