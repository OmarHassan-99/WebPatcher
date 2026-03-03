import DetectorService from '../services/detectorService.js';
import path from 'path';

// هنا حط المسار الحقيقي لأي مشروع عندك على الجهاز (PHP أو Node.js أو غيره)
// جرب المسار اللي كنا شغالين عليه مثلاً:
const myRealPath = "M:/Graduation_Projct/Graduation-Project/backend/services/web_patcher_storage/test";

async function runRealWorldTest() {
    console.log("🚀 Starting Real-World Language Detection Test...");
    console.log(`📂 Path to Scan: ${myRealPath}\n`);

    try {
        const startTime = Date.now();

        // تشغيل الـ Detector الفعلي
        const detectedLang = await DetectorService.detectLanguage(myRealPath);

        const endTime = Date.now();

        console.log("---------------------------------------");
        console.log(`✅ Result: ${detectedLang.toUpperCase()}`);
        console.log(`⏱️ Time Taken: ${endTime - startTime}ms`);
        console.log("---------------------------------------");

    } catch (err) {
        console.error("❌ Test Failed with Error:", err.message);
    }
}

runRealWorldTest();