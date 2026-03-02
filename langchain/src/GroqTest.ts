import { PatchGenerator } from "./services/PatchGenerator";
import { GroqProvider } from "./llm/groq";
import * as dotenv from "dotenv";
import path from "path";

// إعداد المسار الصحيح للوصول لملف الـ .env في فولدر backend
const envPath = path.resolve(__dirname, "../../backend/.env");
dotenv.config({ path: envPath });

async function runNodeJsBatchTest() {
    console.log("🚀 Starting Node.js Batch Patch Test...");
    console.log("Looking for .env at:", envPath);
    console.log("Checking API Key:", process.env.GROQ_API_KEY ? "✅ Found" : "❌ Not Found");

    try {
        // 1. تهيئة محرك Groq
        const groq = GroqProvider.getInstance();
        await groq.initialize();

        // 2. إنشاء مولد الإصلاحات
        const generator = new PatchGenerator();

        // 3. قائمة الثغرات لاختبار الـ Batch Logic
        const vulnerabilities = [
            {
                alert_name: "SQL Injection",
                risk_level: "High",
                affected_url: "http://localhost:3000/api/users/login",
                description: "User input is directly concatenated into a SQL query string.",
                evidence: "SELECT * FROM admins WHERE user = '\" + req.body.user + \"'",
                method: "POST",
                parameter: "user",
                cwe_id: 89
            },
            {
                alert_name: "Cross-Site Scripting (Reflected XSS)",
                risk_level: "High",
                affected_url: "http://localhost:3000/search",
                description: "Input from the search query is reflected back to the page without encoding.",
                evidence: "res.send('<h1>Search results for: ' + req.query.q + '</h1>')",
                method: "GET",
                parameter: "q",
                cwe_id: 79
            }
        ];

        // 4. تحديد سياق Node.js لضمان جودة الكود الناتج
        const nodeContext = {
            lang: ["Node.js", "TypeScript"],
            fw: ["Express"],
            db: ["PostgreSQL"]
        };

        console.log(`\n📡 Sending ${vulnerabilities.length} vulnerabilities to Groq in ONE batch...`);
        const startTime = Date.now();

        // 5. طلب الإصلاحات
        const results = await generator.generatePatches(vulnerabilities, nodeContext);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✨ Batch processing completed in ${duration}s`);

        // 6. عرض النتائج مع استخدام Type Guard لتجنب أخطاء TypeScript
        results.forEach((res, index) => {
            if (res.success === true) {
                console.log(`\n✅ Patch #${index + 1}: ${vulnerabilities[index].alert_name}`);
                console.log(`- File Type: ${res.data.file_type}`);
                console.log(`- Suggested Fix Snippet:\n${res.data.suggested_fix}`);
                console.log(`- Reasoning: ${res.data.reasoning}`);
            } else {
                // هنا TypeScript يسمح بقراءة error لأننا في بلوك الفشل
                console.error(`\n❌ Patch #${index + 1} Failed: ${res.error}`);
            }
        });

    } catch (error: any) {
        console.error("\n💥 Test Execution Failed:", error.message);
    }
}

// تنفيذ التيست
runNodeJsBatchTest()
    .then(() => console.log("\n🏁 Test finished."))
    .catch(err => console.error("Fatal Error:", err));