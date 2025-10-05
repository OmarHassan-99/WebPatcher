const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { normalizeZapReport } = require("../services/normalize");
const ScanJob = require("../models/scanJobModel").default;
const Finding = require("../models/FindingModel").default;
console.log("starting test")
beforeAll(async () => {
    // We separate the base URI from the options
    const baseUri = "mongodb+srv://Abdullah:bgwmGp3mv7D5yIOU@cluster0.7bu6v0s.mongodb.net/";
    const dbName = "normalizer_test";
    const queryParams = "?retryWrites=true&w=majority&appName=Cluster0";

    // Now we construct the URI in the correct order
    await mongoose.connect(`${baseUri}${dbName}${queryParams}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

afterAll(async () => {
    await mongoose.connection.close();
});

beforeEach(async () => {
    await Finding.deleteMany({});
    await ScanJob.deleteMany({});
});

test("normalizeZapReport should parse real ZAP JSON file and store findings", async () => {
    const reportPath = path.join(__dirname, "sample", "Zap-Report.json");
    const reportData = fs.readFileSync(reportPath, "utf-8");
    const zapJson = JSON.parse(reportData);

    const fakeUserId = new mongoose.Types.ObjectId();
    const scan = await ScanJob.create({
        targetUrl: zapJson.site?.[0]?.["@name"] || "unknown",
        status: "queued",
        user: fakeUserId,
    });
    console.log("after")

    const findings = await normalizeZapReport(zapJson, scan._id);

    console.log("after normalize")
    expect(findings.length).toBeGreaterThan(0);

    const updatedScan = await ScanJob.findById(scan._id).populate("findings");

    console.log("✅ Findings Count:", updatedScan.findings.length);
    console.log("🔍 First Finding:", updatedScan.findings[0]);

    expect(updatedScan.status).toBe("completed");
});
