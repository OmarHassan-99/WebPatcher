import DetectorService from '../services/detectorService.js';
import SemgrepService from '../services/smgrepService.js';

class MappingService {
    /**
     * الوظيفة الرئيسية: ربط تنبيه ZAP بملف الكود المصدري
     * @param {string} projectPath - مسار المشروع المنسوخ
     * @param {Object} zapAlert - كائن يحتوي على (url, parameter, type)
     */
    async mapAlertToCode(projectPath, zapAlert) {
        console.log(`\n🌐 Starting Mapping for URL: ${zapAlert.url}`);

        // 1. تحديد لغة المشروع (استخدام العين)
        const language = await DetectorService.detectLanguage(projectPath);
        console.log(`[1] Detected Language: ${language}`);

        // 2. محاولة الربط السيمانتيك (عن طريق الباراميتر ونوع الثغرة)
        // دي المحاولة الأدق (High Precision)
        let location = await SemgrepService.findVulnerabilityLocation(projectPath, zapAlert, language);

        if (location) {
            console.log(`✅ Precision Match Found: ${location.filePath} at line ${location.line}`);
            return location;
        }

        // 3. المحاولة الثانية: البحث عن طريق أجزاء الـ URL (Route Mapping)
        // بنستخدمها لو الباراميتر مش واضح أو الكود معقد (Medium Precision)
        console.log(`⚠️ Precision match failed. Trying Route-based mapping...`);
        const urlFragments = this.extractUrlFragments(zapAlert.url);

        for (const fragment of urlFragments) {
            // بنجرب ندور على كلمات زي "search" أو "products"
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

    /**
     * تقطيع الـ URL لحتت مفيدة للبحث
     * https://site.com/rest/products/search -> ['search', 'products']
     */
    extractUrlFragments(url) {
        try {
            const urlObj = new URL(url);
            const parts = urlObj.pathname.split('/').filter(p => p.length > 2);
            return parts.reverse(); // بنبدأ بآخر كلمة لأنها الأهم (غالباً اسم الـ Action)
        } catch (e) {
            return [];
        }
    }
}

export default new MappingService();