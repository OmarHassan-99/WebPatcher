import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 1. نسخة العرض الجمالي (لليوزر أو للـ Debugging)
 */
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

/**
 * 2. نسخة الـ AI (قائمة مسارات واضحة وموفرة للتوكنز)
 */
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
            // ريكيرسيف لجلب الملفات داخل المجلدات
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
        // تحديد مكان التخزين المؤقت للمشاريع
        this.baseTempPath = path.join(__dirname, '..', '..', 'web_patcher_storage');
        if (!fs.existsSync(this.baseTempPath)) {
            fs.mkdirSync(this.baseTempPath, { recursive: true });
        }
    }

    /**
     * وظيفة تحميل الكود باستخدام Sparse Checkout لسرعة وكفاءة أعلى
     */
    async downloadSourceCode(repoUrl, userId) {
        const jobId = `job_${userId}_${Date.now()}`;
        const targetDir = path.join(this.baseTempPath, jobId);

        try {
            fs.mkdirSync(targetDir, { recursive: true });
            const options = { cwd: targetDir, stdio: 'pipe' };

            // تجهيز بيئة Git
            execSync('git init', options);
            execSync(`git remote add origin ${repoUrl}`, options);
            console.log("Initialized git repository and set remote.");


            // تفعيل خاصية الـ Sparse Checkout
            execSync('git config core.sparseCheckout true', options);

            // تحديد أنماط الملفات المطلوبة فقط (Source Code) واستبعاد الملفات الثقيلة
            const patterns = [
                '/*.*',              // ملفات الـ Root (مثل package.json, index.js)
                '/**/*.js',          // جميع ملفات البرمجة بمختلف الامتدادات
                '/**/*.ts',
                '/**/*.jsx',
                '/**/*.tsx',
                '/**/*.php',
                '/**/*.py',
                '/**/*.java',
                '/**/*.go',
                '/**/*.html',
                '/**/web.config',    // ملفات الإعدادات الأمنية
                '/**/.htaccess',
                '/src/**',           // المجلدات البرمجية الشائعة
                '/app/**',
                '/routes/**',
                '/controllers/**',
                '/api/**',
                '!/.git/**',         // استبعاد ملفات الـ Git الداخلية
                '!/**/node_modules/**', // استبعاد المكتبات
                '!/**/*.jpg',        // استبعاد الصور والميديا لتقليل الحجم
                '!/**/*.png',
                '!/**/*.mp4',
                '!/**/*.pdf'
            ].join('\n');

            // كتابة القواعد لـ Git
            fs.writeFileSync(path.join(targetDir, '.git', 'info', 'sparse-checkout'), patterns);

            console.log(`[RepoDownloader] Starting sparse download for User: ${userId}`);

            // محاولة التحميل من الفرع الأساسي (Main أو Master)
            try {
                console.log("Pulled from 'main' branch.");


                execSync('git pull --depth 1 origin main', options);
            } catch (e) {
                try {
                    execSync('git pull --depth 1 origin master', options);
                } catch (err) {
                    throw new Error("Failed to pull from main or master branch. Check repo URL or branch name.");
                }
            }

            console.log(`[RepoDownloader] Repository successfully localized at: ${targetDir}`);
            return targetDir;

        } catch (error) {
            console.error(`[RepoDownloader] Critical Error: ${error.message}`);
            // تنظيف المجلد في حالة الفشل لتوفير المساحة
            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
            }
            throw error;
        }
    }
}

export default RepoDownloader;