import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

class UrlMapper {
    static findFilesWithSemgrep(repoPath, routePattern) {
        console.log(`[UrlMapper] Searching for pattern: ${routePattern}`);
        let candidates = new Set();

        try {
            // 1. الأولوية القصوى: البحث عن تطابق اسم الملف (Exact Filename Match)
            const allFiles = this.getAllFiles(repoPath);

            // هندور لو فيه ملف اسمه بالظبط زي الـ Pattern
            const exactMatch = allFiles.find(file =>
                path.basename(file).toLowerCase() === routePattern.toLowerCase()
            );

            if (exactMatch) {
                console.log(`🎯 Exact match found by filename: ${exactMatch}. Stopping further search.`);
                return [exactMatch]; // رجع الملف ده بس واقفل الفانكشن هنا
            }

            // 2. لو ملقيناش تطابق بالاسم، نبدأ ندور "جزيئياً" في أسامي الملفات
            allFiles.forEach(file => {
                const fileName = path.basename(file).toLowerCase();
                if (fileName.includes(routePattern.toLowerCase())) {
                    candidates.add(file);
                }
            });

            // 3. البحث جوه المحتوى باستخدام Semgrep (فقط لو لسه محتاجين كانديدات)
            const semgrepCmd = `semgrep --lang generic --pattern "${routePattern}" "${repoPath}" --json`;
            const output = execSync(semgrepCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
            const result = JSON.parse(output);

            if (result.results && result.results.length > 0) {
                result.results.forEach(match => {
                    const fullPath = path.resolve(match.path);
                    candidates.add(fullPath);
                });
            }

            const finalCandidates = Array.from(candidates);
            console.log(`✅ Search complete. Found ${finalCandidates.length} candidates.`);
            return finalCandidates;

        } catch (error) {
            console.error(`❌ Error in findFilesWithSemgrep: ${error.message}`);
            return Array.from(candidates);
        }
    }

    // فانكشن مساعدة عشان تجيب كل الملفات في الـ Repo
    static getAllFiles(dirPath, arrayOfFiles) {
        const files = fs.readdirSync(dirPath);
        arrayOfFiles = arrayOfFiles || [];

        files.forEach((file) => {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                // تجاهل فولدرات الـ git والـ node_modules
                if (file !== '.git' && file !== 'node_modules') {
                    arrayOfFiles = this.getAllFiles(dirPath + "/" + file, arrayOfFiles);
                }
            } else {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        });

        return arrayOfFiles;
    }

    static getRoutePattern(zapUrl) {
        try {
            const urlObj = new URL(zapUrl);
            const segments = urlObj.pathname.split('/').filter(s => s.length > 0);
            return segments.length > 0 ? segments[segments.length - 1] : null;
        } catch (e) {
            return null;
        }
    }
}

export default UrlMapper;