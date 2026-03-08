import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateFileTree = (dirPath, prefix = '') => {
    let tree = '';
    const files = fs.readdirSync(dirPath);

    const filteredFiles = files.filter(file => !['.git', 'node_modules'].includes(file));

    filteredFiles.forEach((file, index) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const isLast = index === filteredFiles.length - 1;

        const connector = isLast ? '└── ' : '├── ';
        tree += `${prefix}${connector}${file}\n`;

        if (stats.isDirectory()) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            tree += generateFileTree(filePath, newPrefix);
        }
    });

    return tree;
};

class RepoDownloader {
    constructor() {
        this.baseTempPath = path.join(__dirname, '..//..//web_patcher_storage');
        if (!fs.existsSync(this.baseTempPath)) {
            fs.mkdirSync(this.baseTempPath);
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
            execSync('git config core.sparseCheckout true', options);

            const patterns = [

                '/*.json', '/*.xml', '/*.txt', '/*.toml', '/*.config', '/*.js',


                '/src/', '/lib/', '/app/', '/api/', '/controllers/', '/models/', '/routes/', '/views/', '/public/',


                '/**/*.js', '/**/*.ts', '/**/*.jsx', '/**/*.tsx',
                '/**/*.php', '/**/*.py', '/**/*.java', '/**/*.jsp',
                '/**/*.cs', '/**/*.aspx', '/**/*.go', '/**/*.rb',


                '/**/*.html', '/**/*.htm', '/**/*.css', '/**/*.scss',
                '/**/web.config', '/**/.htaccess', '/**/nginx.conf',


                '!/**/.git/',
                '!/**/node_modules/',
                '!/**/vendor/',
                '!/**/*.jpg', '!/**/*.jpeg', '!/**/*.png', '!/**/*.gif', '!/**/*.svg',
                '!/**/*.mp4', '!/**/*.pdf', '!/**/*.zip', '!/**/*.woff', '!/**/*.ttf'
            ].join('\n');

            fs.writeFileSync(path.join(targetDir, '.git', 'info', 'sparse-checkout'), patterns);

            try {
                execSync('git pull --depth 1 origin main', options);
            } catch (e) {
                execSync('git pull --depth 1 origin master', options);
            }

            return targetDir;
        } catch (error) {
            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
            }
            throw error;
        }


    }

}

export default RepoDownloader; 