const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Раздаём статику из текущей папки (index.html, style.css, script.js лежат рядом)
app.use(express.static(__dirname));

// Все остальные запросы отдаём index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер "Игра разума" запущен на порту ${PORT}`);
});
