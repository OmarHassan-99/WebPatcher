import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

class SemgrepService {
    constructor() {
        /**
         * قاموس الأنماط الديناميكية (Semantic Patterns)
         * نستخدم $REQ و $ANY و $SINK كمتغيرات وهمية (Metavariables) 
         * ليفهم سيمجريب المنطق البرمجي بدلاً من النص الثابت.
         */
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

    /**
     * الوظيفة الرئيسية للربط بين تنبيه ZAP ومكان الكود
     */
    async findVulnerabilityLocation(projectPath, zapAlert, language) {
        const { parameter, type } = zapAlert;
        const normalizedPath = projectPath.replace(/\\/g, '/');

        // 1. اختيار النمط الديناميكي بناءً على اللغة ونوع الثغرة
        const langConfigs = this.dynamicPatterns[language] || this.dynamicPatterns['javascript'];
        const template = langConfigs[type] || langConfigs['Generic'];
        const pattern = template.replace('${param}', parameter);

        console.log(`🚀 Executing Dynamic Scan: [Lang: ${language}] [Pattern: ${pattern}]`);

        try {
            // 2. محاولة البحث السيمانتيك (بفهم الكود)
            let results = await this.runSemgrep(normalizedPath, language, pattern);

            // 3. الحل البديل (Fallback): إذا فشل البحث السيمانتيك، نبحث عن الباراميتر كـ String
            if (results.length === 0) {
                console.log(`⚠️ Semantic match failed. Trying Generic String Search for: ${parameter}`);
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

    /**
     * تنفيذ أمر سيمجريب في التيرمينال
     */
    async runSemgrep(targetPath, lang, pattern) {
        // نستخدم --json للحصول على مخرجات برمجية دقيقة
        const command = `semgrep --lang ${lang} --pattern "${pattern}" "${targetPath}" --json --quiet --no-git-ignore`;

        try {
            const { stdout } = await execPromise(command);
            const output = JSON.parse(stdout);
            return output.results || [];
        } catch (error) {
            // سيمجريب قد يخرج بـ Code 1 إذا وجد نتائج، لذا نفحص الـ stdout
            if (error.stdout) {
                const output = JSON.parse(error.stdout);
                return output.results || [];
            }
            return [];
        }
    }

    /**
     * تنسيق النتيجة النهائية لتكون جاهزة للـ AI
     */
    formatResult(finding) {
        return {
            filePath: finding.path,
            line: finding.start.line,
            snippet: finding.extra.lines.trim(),
            message: finding.extra.message,
            fullContent: finding.extra.lines // سنحتاجه لاحقاً لعمل الـ Patch
        };
    }
}

export default new SemgrepService();