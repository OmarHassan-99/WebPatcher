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
        const { parameter, type } = zapAlert;
        const normalizedPath = projectPath.replace(/\\/g, '/');


        const langConfigs = this.dynamicPatterns[language] || this.dynamicPatterns['javascript'];
        const template = langConfigs[type] || langConfigs['Generic'];
        const pattern = template.replace('${param}', parameter);

        // console.log(` Executing Dynamic Scan: [Lang: ${language}] [Pattern: ${pattern}]`);

        try {

            let results = await this.runSemgrep(normalizedPath, language, pattern);


            if (results.length === 0) {
                // console.log(` Semantic match failed. Trying Generic String Search for: ${parameter}`);
                results = await this.runSemgrep(normalizedPath, 'generic', parameter);
            }

            if (results.length > 0) {
                return this.formatResult(results[0]);
            }

            return null;
        } catch (error) {
            console.error("❌ Semgrep Execution Error:", error.message);
            return null;
        }
    }


    async runSemgrep(targetPath, lang, pattern) {

        const command = `semgrep --lang ${lang} --pattern "${pattern}" "${targetPath}" --json --quiet --no-git-ignore`;

        try {
            const { stdout } = await execPromise(command);
            const output = JSON.parse(stdout);
            return output.results || [];
        } catch (error) {

            if (error.stdout) {
                const output = JSON.parse(error.stdout);
                return output.results || [];
            }
            return [];
        }
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