// backend/services/zapService.js

// Changed from 'require' to 'import'
import ZapClient from 'zaproxy';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const zapOptions = {
    apiKey: '123',
    proxy: {
        host: '127.0.0.1',
        port: 8080,
    },
};

const zap = new ZapClient(zapOptions);

export const initiateScan = async (targetUrl) => {
    console.log(`[ZapService] Starting scan for: ${targetUrl}`);

    const spiderId = await zap.spider.scan(targetUrl);
    while (true) {
        const status = parseInt(await zap.spider.status(spiderId), 10);
        console.log(`[ZapService] Spider progress: ${status}%`);
        if (status >= 100) break;
        await sleep(1000);
    }

    const ascanId = await zap.ascan.scan(targetUrl);
    while (true) {
        const status = parseInt(await zap.ascan.status(ascanId), 10);
        console.log(`[ZapService] Active Scan progress: ${status}%`);
        if (status >= 100) break;
        await sleep(5000);
    }

    console.log('[ZapService] Scan finished. Retrieving report...');
    return await zap.core.jsonreport();
};
