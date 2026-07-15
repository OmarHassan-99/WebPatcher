/**
 * Scan Worker — standalone process that consumes scan jobs from RabbitMQ.
 *
 * Usage:
 *   node workers/scanWorker.js
 *
 * This worker connects to RabbitMQ, pulls scan jobs off the `scan_jobs` queue,
 * and executes the scan pipeline. It can be scaled horizontally by running
 * multiple instances.
 */

import "../config/env.js";
import connectDB from "../config/db.js";
import { initQueue, consumeScanJobs, shutdownQueue } from "../services/queueService.js";
import { initSocketIO } from "../services/socketService.js";
import http from "http";

// We need a minimal HTTP server for Socket.io to emit events back to clients
const WORKER_PORT = process.env.WORKER_PORT || 0; // 0 = random port
const httpServer = http.createServer();
const FRONT_END_ORIGIN = process.env.FRONT_END_ORIGIN || "http://localhost:3000";

async function start() {
  console.log("[ScanWorker] Starting scan worker...");

  // 1. Connect to MongoDB
  await connectDB();

  // 2. Initialize Socket.io (for emitting scan events)
  initSocketIO(httpServer, FRONT_END_ORIGIN);
  httpServer.listen(WORKER_PORT, () => {
    console.log(`[ScanWorker] Socket.io ready on port ${httpServer.address().port}`);
  });

  // 3. Connect to RabbitMQ
  await initQueue();

  // 4. Start consuming
  await consumeScanJobs(async (jobData) => {
    const { scanJobId, url, userId, githubRepoUrl, authConfig, encryptedToken } = jobData;

    console.log(`[ScanWorker] Processing scan: ${scanJobId} for URL: ${url}`);

    // Dynamically import scanController to use runScanInBackground
    // This avoids circular dependency issues
    const { runScanInBackgroundFromWorker } = await import(
      "../controllers/scanController.js"
    );

    await runScanInBackgroundFromWorker(
      url,
      scanJobId,
      userId,
      githubRepoUrl,
      authConfig || null,
      encryptedToken
    );
  });

  console.log("[ScanWorker] Worker is running. Press Ctrl+C to stop.");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[ScanWorker] Shutting down...");
  await shutdownQueue();
  httpServer.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[ScanWorker] Received SIGTERM, shutting down...");
  await shutdownQueue();
  httpServer.close();
  process.exit(0);
});

start().catch((err) => {
  console.error("[ScanWorker] Failed to start:", err);
  process.exit(1);
});
