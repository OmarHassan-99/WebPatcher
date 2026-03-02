import { PatchGenerator } from "./services/PatchGenerator";
import { CerebrasProvider } from "./llm/cerebras";
import * as dotenv from "dotenv";
import path from "path";

// إعداد المسار للوصول لملف الـ .env في فولدر backend
const envPath = path.resolve(__dirname, "../../backend/.env");
dotenv.config({ path: envPath });

async function runCerebrasTest() {
    console.log("🚀 Starting Cerebras (Qwen-Coder) Integration Test...");
    console.log("Checking API Key:", process.env.CEREBRAS_API_KEY ? "✅ Found" : "❌ Not Found");

    try {
        // 1. تهيئة Cerebras
        const cerebras = CerebrasProvider.getInstance();
        await cerebras.initialize();

        const generator = new PatchGenerator();

        // 2. بيانات ثغرة لاختبار قدرة الموديل على كتابة الكود
        const mockVuln = {
                alert_name: "SQL Injection",
                risk_level: "High",
                affected_url: "http://localhost:3000/api/users/login",
                description: "User input is directly concatenated into a SQL query string.",
                evidence: "SELECT * FROM admins WHERE user = '\" + req.body.user + \"'",
                method: "POST",
                parameter: "user",
                cwe_id: 89     
        };

        const context = {
            lang: ["Node.js"],
            fw: ["Express"],
            os: ["Linux"]
        };

        console.log("\n📡 Sending request to Cerebras... (Expected speed: Extremely Fast)");
        const startTime = Date.now();

        // 3. طلب الإصلاح
        const patch = await generator.generatePatch(mockVuln, context);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✨ Success! Cerebras responded in ${duration}s`);
        
        console.log("-----------------------------------------");
        console.log("📄 File Type:", patch.file_type);
        console.log("💡 Suggested Fix Snippet:");
        console.log(patch.suggested_fix);
        console.log("-----------------------------------------");

    } catch (error: any) {
        console.error("\n❌ Cerebras Test Failed!");
        console.error("Details:", error.message);
    }
}

runCerebrasTest();