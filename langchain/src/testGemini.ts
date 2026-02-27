import { PatchGenerator } from "./services/PatchGenerator";
import * as dotenv from "dotenv";

dotenv.config();

async function runTest() {
    const generator = new PatchGenerator();
    const mockVuln = {
        alert_name: "SQL Injection",
        risk_level: "High",
        affected_url: "http://localhost:3000/api/users",
        description: "A SQL injection vulnerability is present in the id parameter.",
    };
    
    try {
        console.log("Generating patch using Gemini...");
        const patch = await generator.generatePatch(mockVuln);
        console.log("Success! Output:");
        console.log(JSON.stringify(patch, null, 2));
    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTest();
