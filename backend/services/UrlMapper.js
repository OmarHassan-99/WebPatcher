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

            return route.replace(/\/\d+/g, '/...');
        } catch (e) {
            return null;
        }
    }

    /**
     * البحث الاحترافي باستخدام Semgrep مع ميزة الـ Exact Match
     */
    static findFilesWithSemgrep(repoPath, routePattern) {
        try {
            console.log(`[Semgrep] Scanning for route: ${routePattern}`);



            const potentialFileName = routePattern.split('/').filter(s => s.length > 0).pop();

            if (potentialFileName && potentialFileName.includes('.')) {

                const exactMatch = this.findFileByName(repoPath, potentialFileName);
                if (exactMatch) {
                    console.log(`🎯 Exact filename match found: ${exactMatch}`);
                    return [exactMatch];
                }
            }


            const command = `semgrep --lang generic --pattern "${routePattern}" ${repoPath} --json`;
            const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
            const results = JSON.parse(output);

            const files = results.results.map(r => path.resolve(r.path));
            return [...new Set(files)];

        } catch (error) {
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


    static findFileByName(dir, fileName) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (file === '.git' || file === 'node_modules') continue;
                const found = this.findFileByName(fullPath, fileName);
                if (found) return found;
            } else if (file.toLowerCase() === fileName.toLowerCase()) {
                return path.resolve(fullPath);
            }
        }
        return null;
    }
}

export default UrlMapper;