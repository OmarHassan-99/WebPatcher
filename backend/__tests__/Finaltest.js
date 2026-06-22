import RepoDownloader from '../services/githubService.js';
import UrlMapper from '../services/UrlMapper.js';
import DecisionMaker from '../services/DecisionMaker.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 1. إعداد البيئة
dotenv.config();

async function runFullIntegrationTest() {
    console.log("🧪 Starting Full System Integration Test...");
    console.log("------------------------------------------");

    // بيانات التيست (استبدلها بريبو حقيقي بسيط عندك للتجربة)
    const testConfig = {
        repoUrl: "https://github.com/abdullah12q/testgp", // ريبو تجريبي
        zapUrl: "https://testgp-olive.vercel.app/api/vulnerable/users/search?email=%27",
        userId: "test_user_001",
        apiKey: process.env.OPENAI_API_KEY
    };

    if (!testConfig.apiKey) {
        console.error("❌ Error: OPENAI_API_KEY is missing in .env file");
        return;
    }

    try {
        // --- المرحلة الأولى: التنزيل ---
        console.log("Step 1: Testing RepoDownloader...");
        const downloader = new RepoDownloader();
        const localPath = await downloader.downloadSourceCode(testConfig.repoUrl, testConfig.userId);

        if (fs.existsSync(localPath)) {
            console.log(`✅ Success: Repo downloaded to ${localPath}`);
        }

        // --- المرحلة الثانية: الـ Mapping و Semgrep ---
        console.log("\nStep 2: Testing UrlMapper & Semgrep...");
        const routePattern = UrlMapper.getRoutePattern(testConfig.zapUrl);
        console.log(`Pattern generated: ${routePattern}`);

        const candidates = UrlMapper.findFilesWithSemgrep(localPath, routePattern);

        if (candidates.length > 0) {
            console.log(`✅ Success: Semgrep found ${candidates.length} candidates:`);
            candidates.forEach(c => console.log(`   - ${path.basename(c)}`));
        } else {
            console.warn("⚠️ Warning: No candidates found. Check if the route exists in the repo.");
        }

        // --- المرحلة الثالثة: ذكاء الـ AI ---
        console.log("\nStep 3: Testing AI Decision Maker...");
        const ai = new DecisionMaker(testConfig.apiKey);

        // محاكاة بيانات ZAP
        const zapData = {
            url: testConfig.zapUrl,
            type: "SQL Injection",
            parameter: "username"
        };

        const result = await ai.identifyInfectedFile(
            zapData,
            candidates,
            "File tree structure placeholder" // أو نادي على generateFileTreeForAI(localPath)
        );

        if (result && result.selected_file) {
            console.log("✅ Success: AI identified the file!");
            console.log(`🎯 Targeted File: ${result.selected_file}`);
            console.log(`📝 Reason: ${result.reasoning}`);
            console.log(`📊 Confidence: ${result.confidence_score * 100}%`);
        } else {
            console.error("❌ Failed: AI could not make a clear decision.");
            console.error("Full AI Result:", JSON.stringify(result, null, 2));
        }

        console.log("\n------------------------------------------");
        console.log("🎉 Integration Test Completed Successfully!");

    } catch (error) {
        console.error("\n❌ Test Failed with Error:");
        console.error(error.stack);
    }
}

// تشغيل التيست
runFullIntegrationTest();