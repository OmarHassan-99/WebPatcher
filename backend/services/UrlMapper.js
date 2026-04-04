import fs from 'fs';
import path from 'path';

class UrlMapper {
    /**
     * تنظيف الـ URL وتحويله لـ Pattern للبحث
     */
    static getRoutePattern(zapUrl) {
        try {
            const urlObj = new URL(zapUrl);
            let route = urlObj.pathname;
            // بنشيل الأرقام ونحط مكانها wildcard بسيط للبحث
            return route.replace(/\/\d+/g, '');
        } catch (e) {
            return "";
        }
    }

    /**
     * بديل Semgrep: محرك بحث داخلي بيدور في الملفات بسرعة
     */
    static findFilesWithSemgrep(repoPath, routePattern) {
        console.log(`[SearchEngine] Scanning for: ${routePattern}`);
        const candidates = new Set();
        // الامتدادات اللي تهمنا في الـ Backend
        const extensions = ['.js', '.ts', '.py', '.php', '.java', '.go'];

        const walk = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
                        walk(fullPath);
                    }
                } else if (extensions.includes(path.extname(file))) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    // بنشوف لو المسار (الـ Route) مكتوب جوه الكود بأي صيغة
                    if (content.includes(routePattern) || content.includes(routePattern.replace(/\//g, '\\/'))) {
                        candidates.add(fullPath);
                    }
                }
            }
        };

        try {
            walk(repoPath);
        } catch (err) {
            console.error("[SearchEngine] Error walking directory:", err.message);
        }

        return Array.from(candidates);
    }
}

export default UrlMapper;