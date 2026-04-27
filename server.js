const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Статика из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Все запросы -> index.html из public
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер "Игра разума" запущен на порту ${PORT}`);
});
