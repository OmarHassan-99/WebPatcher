import { exec } from 'child_process';
import util from 'util';

// تحويل exec لـ Promise لسهولة الاستخدام مع async/await
const execPromise = util.promisify(exec);

export const runCommand = async (command) => {
    try {
        const { stdout, stderr } = await execPromise(command);
        return { stdout, stderr, error: null };
    } catch (error) {
        // Semgrep يخرج أحياناً بـ Code 1 لو وجد نتائج، لذا نعتبر الـ stdout كـ نجاح
        return {
            stdout: error.stdout || "",
            stderr: error.stderr || "",
            error: error.stdout ? null : error
        };
    }
};