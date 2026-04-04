import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

class UrlMapper {
    /**
     * تنظيف الـ URL لاستخراج الجزء اللي هندور عليه (الـ Route)
     */
    static getRoutePattern(zapUrl) {
        try {
            const urlObj = new URL(zapUrl);
            let route = urlObj.pathname;
            // تحويل /users/123 لـ /users/... عشان الـ Pattern Matching
            // بنبدل الأرقام بـ wildcard
            return route.replace(/\/\d+/g, '/...');
        } catch (e) {
            return null;
        }
    }

    /**
     * البحث الاحترافي باستخدام Semgrep
     */
    static findFilesWithSemgrep(repoPath, routePattern) {
        try {
            console.log(`[Semgrep] Scanning for route: ${routePattern}`);

            // القاعدة (Rule) اللي هنبحث بيها: بنقول لـ semgrep دور على أي مكان فيه نص يشبه الـ route
            // --lang generic بتخلينا ندور في أي لغة (Node, Python, PHP...)
            const command = `semgrep --lang generic --pattern "${routePattern}" ${repoPath} --json`;

            const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
            const results = JSON.parse(output);

            // استخراج مسارات الملفات الفريدة اللي طلع فيها الـ pattern
            const files = results.results.map(r => path.resolve(r.path));
            return [...new Set(files)];

        } catch (error) {
            // Semgrep أحياناً بيرجع exit code 1 لو لقى نتائج، فبنعمل parse للـ stdout حتى لو فيه error
            if (error.stdout) {
                try {
                    const results = JSON.parse(error.stdout);
                    return [...new Set(results.results.map(r => path.resolve(r.path)))];
                } catch (e) {
                    return [];
                }
            }
            console.error("[Semgrep] Error:", error.message);
            return [];
        }
    }
}

export default UrlMapper;