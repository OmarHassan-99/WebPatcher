import fs from 'fs';
import path from 'path';
import { CLIENT_RENEG_WINDOW } from 'tls';

class DetectorService {
    /**
     * الوظيفة الرئيسية: تحديد لغة المشروع
     * @param {string} projectPath - مسار الفولدر المنسوخ
     */
    async detectLanguage(projectPath) {
        try {
            // 1. قراءة الملفات في المستوى الأول (الأولوية لملفات البصمة Marker Files)
            const files = fs.readdirSync(projectPath);

            if (files.includes('package.json')) return 'javascript';
            if (files.includes('composer.json')) return 'php';
            if (files.includes('requirements.txt') || files.includes('manage.py')) return 'python';

            // 2. لو ملقاش بصمة واضحة، ننتقل للعد الديناميكي للامتدادات
            return this.detectByExtensions(projectPath);
        } catch (error) {
            console.error("⚠️ Language Detection Error:", error.message);
            return 'generic';
        }
    }

    /**
     * عد الامتدادات بشكل Recursive لتحديد اللغة السائدة
     */
    detectByExtensions(dirPath) {
        const extensionCounts = {};
        const ignoredFolders = ['node_modules', '.git', 'vendor', 'dist', 'build', 'storage'];

        const scan = (currentPath) => {
            const items = fs.readdirSync(currentPath);

            for (const item of items) {
                const fullPath = path.join(currentPath, item);

                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.isDirectory() && !ignoredFolders.includes(item)) {
                        scan(fullPath); // دخول الفولدرات الفرعية
                    } else if (stats.isFile()) {
                        const ext = path.extname(item).toLowerCase();
                        if (ext) {
                            extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
                        }
                    }
                } catch (e) {
                    // لتجنب التوقف لو فيه ملف عليه حماية أو مشكلة
                    continue;
                }
            }
        };

        scan(dirPath);

        // لو ملقاش أي ملفات خالص في المشروع
        console.log("📊 Extension Counts:", extensionCounts);
        if (Object.keys(extensionCounts).length === 0) return 'generic';
        return this.getLanguageFromStats(extensionCounts);
    }

    /**
     * القاضي: يحول إحصائيات الامتدادات إلى قرار نهائي
     */
    getLanguageFromStats(extensionCounts) {
        // 1. قائمة الامتدادات اللي هنستبعدها من المنافسة على "لغة المشروع"
        const assetExtensions = ['.png', '.jpg', '.xml', '.html', '.css', '.svg', '.wmv', '.drawio', '.xd', '.json', '.lock'];

        // 2. تصفية العداد بحيث يتبقى فقط لغات البرمجة
        const logicLanguages = Object.keys(extensionCounts).filter(ext => !assetExtensions.includes(ext));

        if (logicLanguages.length === 0) return 'generic';

        // 3. اختيار صاحب أعلى رقم من لغات الـ Logic فقط
        const winner = logicLanguages.reduce((a, b) =>
            extensionCounts[a] > extensionCounts[b] ? a : b
        );

        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'javascript',
            '.php': 'php',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rb': 'ruby',
            '.cs': 'csharp',
            '.cpp': 'cpp',
            '.dart': 'dart'
        };
        console.log(`🎯 Logic Winner: ${winner} (${extensionCounts[winner]} files)`);
        return languageMap[winner] || 'generic';
    }
}

export default new DetectorService();