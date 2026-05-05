import ScanJob from "../models/scanJobModel.js";

export async function resetStalledScans() {
  try {
    const result = await ScanJob.updateMany(
      { status: { $in: ["running", "analyzing", "patching", "validating"] } },
      {
        $set: {
          status: "failed",
          finishedAt: Date.now(),
        },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[System] Reset ${result.modifiedCount} stalled scans to 'failed' status.`,
      );
    }
  } catch (error) {
    console.error("[System] Failed to reset stalled scans:", error);
  }
}
