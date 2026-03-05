import DetectorService from '../services/detectorService.js';
import SemgrepService from '../services/smgrepService.js';

class MappingService {
    /**
     * @param {string} projectPath 
     * @param {Object} zapAlert 
     */
    async mapAlertToCode(projectPath, zapAlert) {
        console.log(`\n🌐 Starting Mapping for URL: ${zapAlert.url}`);


        const language = await DetectorService.detectLanguage(projectPath);
        console.log(`[1] Detected Language: ${language}`);



        let location = await SemgrepService.findVulnerabilityLocation(projectPath, zapAlert, language);

        if (location) {
            console.log(`✅ Precision Match Found: ${location.filePath} at line ${location.line}`);
            return location;
        }



        console.log(`⚠️ Precision match failed. Trying Route-based mapping...`);
        const urlFragments = this.extractUrlFragments(zapAlert.url);

        for (const fragment of urlFragments) {

            const routeLocation = await SemgrepService.runSemgrep(
                projectPath.replace(/\\/g, '/'),
                language,
                fragment
            );

            if (routeLocation && routeLocation.length > 0) {
                console.log(`✅ Route Match Found using fragment [${fragment}]: ${routeLocation[0].path}`);
                return SemgrepService.formatResult(routeLocation[0]);
            }
        }

        console.error(`❌ Mapping Failed: Could not locate the file for ${zapAlert.url}`);
        return null;
    }


    extractUrlFragments(url) {
        if (!url) return []; // لو الـ url مش مبعوت ميعملش crash
        try {
            const urlObj = new URL(url);
            // بنقسم الـ path وبنشيل الأرقام (IDs) عشان ندور على أسماء الـ Routes بس
            const parts = urlObj.pathname.split('/').filter(p => p.length > 2 && !/\d/.test(p));
            return parts.reverse();
        } catch (e) {
            return [];
        }
    }
}
export default new MappingService();