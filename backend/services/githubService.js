import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const generateFileTreeVisual = (dirPath, prefix = '') => {
    let tree = '';
    if (!fs.existsSync(dirPath)) return '';

    const files = fs.readdirSync(dirPath);
    const filteredFiles = files.filter(file => !['.git', 'node_modules', '.env'].includes(file));

    filteredFiles.forEach((file, index) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const isLast = index === filteredFiles.length - 1;

        const connector = isLast ? '└── ' : '├── ';
        tree += `${prefix}${connector}${file}\n`;

        if (stats.isDirectory()) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            tree += generateFileTreeVisual(filePath, newPrefix);
        }
    });

    return tree;
};


export const generateFileTreeForAI = (dirPath, currentRelativePath = '') => {
    let paths = [];
    if (!fs.existsSync(dirPath)) return '';

    const files = fs.readdirSync(dirPath);
    const filteredFiles = files.filter(file => !['.git', 'node_modules', '.env'].includes(file));

    filteredFiles.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const relativePath = path.join(currentRelativePath, file);

        if (stats.isDirectory()) {
            const subPaths = generateFileTreeForAI(filePath, relativePath);
            if (subPaths) paths.push(...subPaths.split('\n'));
        } else {
            paths.push(relativePath);
        }
    });

    return paths.filter(p => p).join('\n');
};

class RepoDownloader {
    constructor() {

        this.baseTempPath = path.join(__dirname, '..', '..', 'web_patcher_storage');
        if (!fs.existsSync(this.baseTempPath)) {
            fs.mkdirSync(this.baseTempPath, { recursive: true });
        }
    }


    async downloadSourceCode(repoUrl, userId) {
        const jobId = `job_${userId}_${Date.now()}`;
        const targetDir = path.join(this.baseTempPath, jobId);

        try {
            fs.mkdirSync(targetDir, { recursive: true });
            const options = { cwd: targetDir, stdio: 'pipe' };


            execSync('git init', options);
            execSync(`git remote add origin ${repoUrl}`, options);
            console.log("Initialized git repository and set remote.");



            execSync('git config core.sparseCheckout true', options);


            const patterns = [
                '/*.*',
                '/**/*.js',
                '/**/*.ts',
                '/**/*.jsx',
                '/**/*.tsx',
                '/**/*.php',
                '/**/*.py',
                '/**/*.java',
                '/**/*.go',
                '/**/*.html',
                '/**/web.config',
                '/**/.htaccess',
                '/src/**',
                '/app/**',
                '/routes/**',
                '/controllers/**',
                '/api/**',
                '!/.git/**',
                '!/**/node_modules/**',
                '!/**/*.jpg',
                '!/**/*.png',
                '!/**/*.mp4',
                '!/**/*.pdf'
            ].join('\n');

            fs.writeFileSync(path.join(targetDir, '.git', 'info', 'sparse-checkout'), patterns);

            console.log(`[RepoDownloader] Starting sparse download for User: ${userId}`);



            let branchCandidates = [];
            try {
                const headSymref = execSync(`git ls-remote --symref "${repoUrl}" HEAD`, {
                    stdio: 'pipe',
                }).toString();
                const match = headSymref.match(/ref:\s+refs\/heads\/([^\s]+)\s+HEAD/);
                if (match && match[1]) {
                    branchCandidates.push(match[1]);
                }
            } catch {

            }

            branchCandidates.push('main', 'master');
            branchCandidates = [...new Set(branchCandidates)];

            let pulled = false;
            for (const branch of branchCandidates) {
                try {
                    console.log(`[RepoDownloader] Trying branch: ${branch}`);
                    execSync(`git pull --depth 1 origin ${branch}`, options);
                    console.log(`[RepoDownloader] Pulled from '${branch}' branch.`);
                    pulled = true;
                    break;
                } catch {

                }
            }

            if (!pulled) {
                throw new Error(
                    `Failed to pull from candidate branches: ${branchCandidates.join(', ')}. ` +
                    `Check repo URL, branch visibility, or access permissions.`
                );
            }

            console.log(`[RepoDownloader] Repository successfully localized at: ${targetDir}`);
            return targetDir;

        } catch (error) {
            console.error(`[RepoDownloader] Critical Error: ${error.message}`);
            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
            }
            throw error;
        }
    }
}

export default RepoDownloader;