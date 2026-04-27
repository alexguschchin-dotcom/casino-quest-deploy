const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Раздаём все статические файлы из текущей папки (index.html, style.css, script.js)
app.use(express.static(__dirname));

// Для всех остальных маршрутов отдаём index.html (для поддержки клиентского роутинга, если понадобится)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер "Игра разума" запущен на порту ${PORT}`);
});



