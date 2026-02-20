import 'dotenv/config.js';
import RepoDownloader from '../services/githubService.js';
import PRService from '../services/pullRequestGithub.js';
import fs from 'fs';
import path from 'path';
const downloader = new RepoDownloader();
// console.log("Token starts with:", process.env.GITHUB_TEST_TOKEN?.substring(0, 4));
const prService = new PRService(process.env.GITHUB_TEST_TOKEN);

const repoUrl = 'https://github.com/Abdelrahman339/QuickBite.git';
const repoOwner = 'Abdelrahman339';
const repoName = 'QuickBite';

async function startFullFlow() {
    try {
        const repoPath = await downloader.downloadSourceCode(repoUrl, 'user_1');

        const filePath = path.join(repoPath, '/backend/server.js');
        if (fs.existsSync(filePath)) {
            fs.appendFileSync(filePath, '\n\n// Patched by Web Patcher AI');
            console.log("File Edited!");
        }

        const branchName = `security-fix-${Date.now()}`;
        const prUrl = await prService.createPatchAndPR(repoPath, repoOwner, repoName, branchName);

        console.log(`Check your PR here: ${prUrl}`);

    } catch (err) {
        console.error("Flow Error:", err);
    }
}

startFullFlow();