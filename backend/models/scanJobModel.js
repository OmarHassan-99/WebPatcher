import mongoose from "mongoose";
const user = require("../models/scanJobModel");
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
    context: {
      languages: [{ type: String }],
      frameworks: [{ type: String }],
      repoUrl: { type: String },
      branch: { type: String, default: "main" },
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
    },
    zapScanId: {
      type: String,
    },
    findings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Finding",
      },
    ],
    report: {
      type: mongoose.Schema.Types.Mixed,
    },
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
