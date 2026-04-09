import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

class UrlMapper {
    static findFilesWithSemgrep(repoPath, routePattern) {
        if (!routePattern) return [];
        console.log(`[UrlMapper] Searching for pattern: ${routePattern}`);
        let candidates = new Set();
        const routePatternLower = routePattern.toLowerCase();

        try {
            const allFiles = this.getAllFiles(repoPath);

            // 1. الأولوية القصوى: البحث عن تطابق اسم الملف (Exact Filename Match)
            const exactMatch = allFiles.find(file => {
                const base = path.basename(file).toLowerCase();
                return base === routePatternLower && !this.isBlacklisted(base);
            });

            if (exactMatch) {
                console.log(`🎯 Exact match found by filename: ${exactMatch}. Stopping further search.`);
                return [exactMatch];
            }

            // 2. التحقق لو كان Asset زي صورة أو ملف CSS/Font
            const isAsset = this.isStaticAsset(routePatternLower);

            // 3. لو ملقيناش تطابق بالاسم، نبدأ ندور "جزيئياً" في أسامي الملفات
            allFiles.forEach(file => {
                const fileName = path.basename(file).toLowerCase();
                if (fileName.includes(routePatternLower) && !this.isBlacklisted(fileName)) {
                    candidates.add(file);
                }
            });

            // لو هو Asset ولقينا كانديدات كفاية (أكتر من 3) نكتفي بيهم بدل ما نتعب الـ AI
            if (isAsset && candidates.size > 0) {
                console.log(`📎 Asset pattern detected. Found ${candidates.size} matches by filename.`);
                return Array.from(candidates);
            }

            // 4. البحث جوه المحتوى باستخدام Semgrep - فقط لو مش Asset
            if (!isAsset) {
                try {
                    const semgrepCmd = `semgrep --lang generic --pattern "${routePattern}" "${repoPath}" --json 2>nul`;
                    const output = execSync(semgrepCmd, { 
                        encoding: 'utf-8', 
                        maxBuffer: 10 * 1024 * 1024,
                        stdio: ['pipe', 'pipe', 'ignore'] 
                    });
                    const result = JSON.parse(output);

                    if (result.results && result.results.length > 0) {
                        result.results.forEach(match => {
                            const fullPath = path.resolve(match.path);
                            const fileName = path.basename(fullPath).toLowerCase();
                            if (!this.isBlacklisted(fileName)) {
                                candidates.add(fullPath);
                            }
                        });
                    }
                } catch (semgrepError) {
                    console.warn(`[UrlMapper] Semgrep extraction failed. Using native fallback for non-asset.`);
                    
                    allFiles.forEach(file => {
                        try {
                            const stats = fs.statSync(file);
                            if (stats.size > 1024 * 1024) return;
                            const fileName = path.basename(file).toLowerCase();
                            if (this.isBlacklisted(fileName)) return;

                            const ext = path.extname(file).toLowerCase();
                            if (this.isStaticAsset(ext)) return; // Skip binary content search

                            const content = fs.readFileSync(file, 'utf-8');
                            if (content.toLowerCase().includes(routePatternLower)) {
                                candidates.add(file);
                            }
                        } catch (e) {}
                    });
                }
            }

            const finalCandidates = Array.from(candidates);
            console.log(`✅ Search complete. Found ${finalCandidates.length} candidates.`);
            return finalCandidates;

        } catch (error) {
            console.error(`❌ Error in findFilesWithSemgrep: ${error.message}`);
            return Array.from(candidates);
        }
    }

    static isBlacklisted(fileName) {
        const blacklist = [
            'readme.md', 'license', 'license.txt', '.gitignore', '.gitattributes',
            'package.json', 'package-lock.json', 'composer.json', 'composer.lock',
            'requirements.txt', 'pipfile', 'dockerfile', 'docker-compose.yml',
            'tsconfig.json', 'jsconfig.json', '.env', '.env.example'
        ];
        return blacklist.includes(fileName.toLowerCase());
    }

    static isStaticAsset(pattern) {
        const assetExtensions = [
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', 
            '.css', '.scss', '.less',
            '.woff', '.woff2', '.ttf', '.eot',
            '.mp4', '.webm', '.mp3', '.pdf', '.ico'
        ];
        return assetExtensions.some(ext => pattern.endsWith(ext));
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
            if (segments.length === 0) return null;

            const lastSegment = segments[segments.length - 1];
            
            // If the pattern is too generic or matches the root "Vulnerable-Web-Application" type patterns
            if (lastSegment.toLowerCase().includes('application') || lastSegment.length < 2) {
                return null;
            }

            return lastSegment;
        } catch (e) {
            return null;
        }
    }
}

export default UrlMapper;