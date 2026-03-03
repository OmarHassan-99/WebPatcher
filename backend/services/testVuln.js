const express = require('express');
const app = express();

app.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    // ثغرة XSS: بنطبع الـ query parameter مباشرة في الـ HTML
    res.send(`<h1>Results for: ${searchTerm}</h1>`);
});

app.listen(3000);