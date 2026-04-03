import UrlMapper from '../services/UrlMapper.js'; // تأكد من المسار
import path from 'path';

async function runTest() {
    const testRepoPath = path.resolve('../../web_patcher_storage/job_user_1_1775253662713'); // المسار اللي فيه الملفات اللي كريتناها
    const testUrl = 'https://testgp-olive.vercel.app/api/vulnerable/users/search?email=%27';

    console.log("--- Starting Semgrep Test ---");

    // 1. تحويل الـ URL لـ Pattern
    const pattern = UrlMapper.getRoutePattern(testUrl);
    console.log(`Target Pattern: ${pattern}`);

    // 2. تشغيل Semgrep
    const foundFiles = UrlMapper.findFilesWithSemgrep(testRepoPath, pattern);

    console.log("--- Results ---");
    if (foundFiles.length > 0) {
        console.log("✅ Success! Found the route in:");
        foundFiles.forEach(f => console.log(` - ${f}`));
    } else {
        console.log("❌ Failed: Could not find any matching files.");
    }
}

runTest();