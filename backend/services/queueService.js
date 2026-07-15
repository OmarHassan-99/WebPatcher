import amqplib from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const SCAN_QUEUE = "scan_jobs";
const RECONNECT_DELAY = 5000;

let connection = null;
let channel = null;
let isConnecting = false;
let isAvailable = false;

/**
 * Establish a connection to RabbitMQ and create a channel.
 * Returns true if connected successfully, false otherwise.
 */
async function connect() {
  if (isConnecting) return isAvailable;
  isConnecting = true;

  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(SCAN_QUEUE, { durable: true });
    await channel.prefetch(1);

    isAvailable = true;
    console.log("[QueueService] Connected to RabbitMQ");

    connection.on("error", (err) => {
      console.error("[QueueService] RabbitMQ connection error:", err.message);
      isAvailable = false;
    });

    connection.on("close", () => {
      console.log("[QueueService] RabbitMQ connection closed. Reconnecting...");
      isAvailable = false;
      channel = null;
      connection = null;
      setTimeout(connect, RECONNECT_DELAY);
    });

    isConnecting = false;
    return true;
  } catch (err) {
    console.warn(
      `[QueueService] RabbitMQ unavailable (${err.message}). Scans will run in-process.`
    );
    isAvailable = false;
    isConnecting = false;
    return false;
  }
}

/**
 * Publish a scan job to the queue.
 * @returns {boolean} true if published, false if queue is unavailable
 */
export async function publishScanJob(scanJobId, payload) {
  if (!isAvailable || !channel) {
    return false;
  }

  try {
    const message = Buffer.from(
      JSON.stringify({ scanJobId: scanJobId.toString(), ...payload })
    );
    channel.sendToQueue(SCAN_QUEUE, message, { persistent: true });
    console.log(
      `[QueueService] Published scan job ${scanJobId} to queue`
    );
    return true;
  } catch (err) {
    console.error("[QueueService] Failed to publish:", err.message);
    return false;
  }
}

/**
 * Consume scan jobs from the queue.
 * @param {Function} handler - async function(msg) that processes the scan
 */
export async function consumeScanJobs(handler) {
  if (!isAvailable || !channel) {
    throw new Error("RabbitMQ channel not available");
  }

  channel.consume(SCAN_QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());
      console.log(
        `[QueueService] Processing scan job: ${data.scanJobId}`
      );
      await handler(data);
      channel.ack(msg);
      console.log(
        `[QueueService] Completed scan job: ${data.scanJobId}`
      );
    } catch (err) {
      console.error(
        `[QueueService] Failed to process scan job:`,
        err.message
      );
      // Reject and re-queue on failure
      channel.nack(msg, false, true);
    }
  });

  console.log("[QueueService] Consumer started, waiting for scan jobs...");
}

/**
 * Check if RabbitMQ is available.
 */
export function isQueueAvailable() {
  return isAvailable;
}

/**
 * Initialize the queue connection (best-effort, non-blocking).
 */
export async function initQueue() {
  await connect();
}

/**
 * Gracefully shut down the connection.
 */
export async function shutdownQueue() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log("[QueueService] Gracefully shut down RabbitMQ connection");
  } catch (err) {
    console.error("[QueueService] Error during shutdown:", err.message);
  }
}

export default {
  publishScanJob,
  consumeScanJobs,
  isQueueAvailable,
  initQueue,
  shutdownQueue,
};
