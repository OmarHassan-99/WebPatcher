import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

class SemgrepService {
    constructor() {

        this.dynamicPatterns = {
            'javascript': {
                'SQL Injection': '$REQ.$ANY.${param} ... $DB.query(...)',
                'Cross Site Scripting': '$REQ.$ANY.${param} ... res.send(...)',
                'Generic': '$REQ.$ANY.${param}'
            },
            'php': {
                'SQL Injection': '$_$ANY["${param}"] ... mysqli_query(...)',
                'Cross Site Scripting': '$_$ANY["${param}"] ... echo ...',
                'Generic': '$_$ANY["${param}"]'
            },
            'java': {
                'SQL Injection': '$REQ.getParameter("${param}") ... $DB.execute(...)',
                'Generic': '$REQ.getParameter("${param}")'
            },
            'python': {
                'SQL Injection': 'request.$ANY.get("${param}") ... $DB.execute(...)',
                'Generic': 'request.$ANY.get("${param}")'
            }
        };
    }

    async findVulnerabilityLocation(projectPath, zapAlert, language) {
        const results = await this.findCandidates(projectPath, zapAlert, language);
        if (results && results.length > 0) {
            // Support returning the first result for legacy compatibility if needed
            const firstMatch = results[0];
            return {
                filePath: firstMatch,
                line: 1, // Default if not found via semantic match
                snippet: "",
                message: "Candidate found via Semgrep/Search"
            };
        }
        return null;
    }

    async findCandidates(projectPath, zapAlert, language) {
        const { parameter, type } = zapAlert;
        const normalizedPath = projectPath.replace(/\\/g, '/');
        const langConfigs = this.dynamicPatterns[language] || this.dynamicPatterns['javascript'];
        const template = langConfigs[type] || langConfigs['Generic'];
        const pattern = template.replace('${param}', parameter);

        try {
            let results = await this.runSemgrep(normalizedPath, language, pattern);

            if (results.length === 0) {
                results = await this.runSemgrep(normalizedPath, 'generic', parameter);
            }

            // Extract unique file paths from results
            const uniquePaths = [...new Set(results.map(r => path.resolve(r.path)))];
            return uniquePaths;
        } catch (error) {
            console.error("❌ Semgrep Candidates Error:", error.message);
            return [];
        }
    }


    async runSemgrep(targetPath, lang, pattern) {
        const command = `semgrep --lang ${lang} --pattern "${pattern}" "${targetPath}" --json --quiet --no-git-ignore 2>nul`;

        try {
            const { stdout } = await execPromise(command);
            const output = JSON.parse(stdout);
            return output.results || [];
        } catch (error) {
            if (error.stdout) {
                try {
                    const output = JSON.parse(error.stdout);
                    return output.results || [];
                } catch (e) { /* ignore parse error */ }
            }

            // Native fallback for Windows/environments without Semgrep
            console.warn(`[SemgrepService] Semgrep failed or missing. Falling back to native search for: ${pattern}`);
            
            // If pattern contains semantic markers ($REQ, $ANY, etc), we treat it as a generic string search for the base param
            const searchString = pattern.includes('$') ? null : pattern;
            if (!searchString) return []; // Cannot easily do semantic search natively

            const results = [];
            const files = this.getAllFilesSync(targetPath);

            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const lines = content.split('\n');
                    lines.forEach((lineText, index) => {
                        if (lineText.toLowerCase().includes(searchString.toLowerCase())) {
                            results.push({
                                path: file,
                                start: { line: index + 1 },
                                extra: {
                                    lines: lineText,
                                    message: `Native match for ${searchString}`
                                }
                            });
                        }
                    });
                } catch (e) { /* skip binary/unreadable */ }
            }
            return results;
        }
    }

    getAllFilesSync(dirPath, arrayOfFiles = []) {
        const files = fs.readdirSync(dirPath);
        files.forEach((file) => {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (file !== '.git' && file !== 'node_modules') {
                    arrayOfFiles = this.getAllFilesSync(fullPath, arrayOfFiles);
                }
            } else {
                arrayOfFiles.push(fullPath);
            }
        });
        return arrayOfFiles;
    }


    formatResult(finding) {
        return {
            filePath: finding.path,
            line: finding.start.line,
            snippet: finding.extra.lines.trim(),
            message: finding.extra.message,
            fullContent: finding.extra.lines
        };
    }
}

export default new SemgrepService();