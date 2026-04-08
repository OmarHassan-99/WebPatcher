import 'dotenv/config.js';
import RepoDownloader from '../services/githubService.js';
import { generateFileTreeVisual, generateFileTreeForAI } from '../services/githubService.js';
import PRService from '../services/pullRequestGithub.js';
import fs from 'fs';
import path from 'path';
const downloader = new RepoDownloader();
const prService = new PRService(process.env.GITHUB_TEST_TOKEN);

const repoUrl = 'https://github.com/abdullah12q/testgp';
const repoOwner = 'Abdelrahman339';
const repoName = 'testGP    ';

async function startFullFlow() {
    try {
        const repoPath = await downloader.downloadSourceCode(repoUrl, 'user_1');


        console.log('\nGenerating Project File Tree: (USER)');
        console.log('---------------------------------');
        const tree = generateFileTreeVisual(repoPath);
        console.log(tree);
        console.log('---------------------------------');
        console.log('\nGenerating Project File Tree: (AI)');
        console.log('---------------------------------');
        const treeAI = generateFileTreeForAI(repoPath);
        console.log(treeAI);
        console.log('---------------------------------');


        const filePath = path.join(repoPath, '/backend/server.js');
        if (fs.existsSync(filePath)) {
            fs.appendFileSync(filePath, '\n\n// Patched by Web Patcher AI');
            console.log("File Edited!");
            console.log("file name: server.js , file path: /backend/server.js");
        }
        // const branchName = `security-fix-${Date.now()}`;
        // const prUrl = await prService.createPatchAndPR(repoPath, repoOwner, repoName, branchName);

        // console.log(`Check your PR here: ${prUrl}`);

    } catch (err) {
        console.error("Flow Error:", err);
    }
}

startFullFlow();