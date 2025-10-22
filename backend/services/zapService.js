import ZapClient from "zaproxy";
import axios from "axios";
import fs from "fs";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const zapOptions = {
  apiKey: "123",
  proxy: {
    host: "127.0.0.1",
    port: 8080,
  },
};

const zap = new ZapClient(zapOptions);
console.log("Starting a new ZAP session to ensure a clean state...");
await zap.core.newSession({});

export const initiateScan = async (targetUrl) => {
  console.log(`[ZapService] Starting scan for: ${targetUrl}`);

  const spiderId = await zap.spider.scan({ url: targetUrl });
  while (true) {
    const response = await zap.spider.status(spiderId);
    const status = parseInt(response.status, 10);
    console.log(`[ZapService] Spider progress: ${status}%`);
    if (status >= 100) break;
    // await sleep(1000);
  }

  // console.log('Resetting scan policy to enable all scanners for a full scan...');
  // await zap.ascan.enableAllScanners({ scanpolicyname: 'Default Policy' });

  // Configure the Default Policy for a fast scan ---
  console.log("Configuring a fast scan policy...");
  await zap.ascan.disableAllScanners({ scanpolicyname: "Default Policy" });

  await zap.ascan.enableScanners({
    ids: "40018,40012",
    scanpolicyname: "Default Policy",
  });

  const ascanResponse = await zap.ascan.scan({
    url: targetUrl,
  });
  const ascanId = ascanResponse.scan;
  while (true) {
    const response = await zap.ascan.status(ascanId);
    const status = parseInt(response.status, 10);
    console.log(`[ZapService] Active Scan progress: ${status}%`);
    if (status >= 100) break;
    // await sleep(5000);
  }

  // console.log(
  //   "[ZapService] Scan finished. Waiting 5 seconds for ZAP to finalize the report..."
  // );

  // await sleep(5000);

  const alerts = await axios.get(
    "http://localhost:8080/JSON/alert/view/alerts/",
    {
      headers: { "X-ZAP-API-Key": zapOptions.apiKey },
      params: {
        baseurl: targetUrl,
        start: 0,
        count: 9999,
      },
    }
  );

  // // --- SAVE THE REPORT AS A FILE FOR VERIFICATION ---
  // console.log("Saving report to report.json...");
  // fs.writeFileSync("report.json", JSON.stringify(alerts.data, null, 2));
  // // --------------------------------------------------
  return alerts.data;
};
