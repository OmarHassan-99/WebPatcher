import RepoDownloader from './githubService.js';
import { generateFileTree } from './githubService.js'; // تأكد إنك عملت لها export

const downloader = new RepoDownloader();
const testRepo = 'https://github.com/Abdelrahman339/QuickBite.git';
const testUser = 'QuickBite_Test_User';

console.log("🚀 Starting Full Process...");

downloader.downloadSourceCode(testRepo, testUser)
    .then(repoPath => {
        console.log('✅ Download Complete!');

        console.log('\n🌳 Generating Project File Tree:');
        console.log('---------------------------------');
        const tree = generateFileTree(repoPath);
        console.log(tree);
        console.log('---------------------------------');

        // الخطوة دي هي اللي هتبعتها للـ LLM مع الـ ZAP Report
        const promptForLLM = `
            Project Structure:
            ${tree}
            
            ZAP Alert: SQL Injection found at /api/users
            Question: Which file(s) from the tree above should I analyze?
        `;

        console.log("💡 Context ready for LLM!");
    })
    .catch(err => console.error('❌ Error:', err.message));