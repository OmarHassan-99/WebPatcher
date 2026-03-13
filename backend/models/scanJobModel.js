import mongoose from "mongoose";

const scanJobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetUrl: { type: String, required: true },
    githubRepoUrl: { type: String },
    targetName: { type: String },
    previousScanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScanJob",
      default: null,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    context: {
      db: [{ type: String }],
      lang: [{ type: String }],
      fw: [{ type: String }],
      os: [{ type: String }],
      scm: [{ type: String }],
      ws: [{ type: String }],
      branch: { type: String, default: "main" },
    },
    authConfig: {
      enabled: { type: Boolean, default: false },
      loginUrl: { type: String },
      usernameField: { type: String, default: "username" },
      passwordField: { type: String, default: "password" },
      username: { type: String },
      password: { type: String },
      loggedInIndicator: { type: String },
      loggedOutIndicator: { type: String },
      extraPostData: { type: String },
    },
    status: {
      type: String,
      enum: [
        "queued",
        "running",
        "analyzing",
        "patching",
        "completed",
        "failed",
      ],
      default: "queued",
    },
    findingsCount: { type: Number, default: 0 },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

const ScanJob =
  mongoose.models.ScanJob || mongoose.model("ScanJob", scanJobSchema);

export default ScanJob;
