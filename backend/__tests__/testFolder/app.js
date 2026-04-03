// file: testFolder/app.js

// 1. Double quotes vs Single quotes
const route1 = "/api/v1/login";
const route2 = '/api/v1/logout';

// 2. Dynamic Route (المطب الحقيقي)
// ZAP هيضرب على /api/v1/products/999/details
app.get('/api/v1/products/:id/details', (req, res) => { res.send("ok") });

// 3. Nested/Complex Path
app.post("/api/v2/admin/dashboard/stats/refresh", (req, res) => { res.send("done") });

// 4. False Positive (كلمة في كومنت - المفروض سيمجريب ميتلغبطش فيها)
// TODO: check the /api/v1/users endpoint later
const myPath = "/api/v1/users"; // ده متغير عادي مش راوت