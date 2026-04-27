const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Где искать статику: сначала в корне, потом в папке public
const possiblePaths = [
    __dirname,
    path.join(__dirname, 'public')
];

let staticDir = null;
for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
        staticDir = p;
        break;
    }
}

if (!staticDir) {
    console.error('❌ Ошибка: не найден index.html ни в корне, ни в папке public');
    process.exit(1);
}

console.log(`✅ Статика из папки: ${staticDir}`);
app.use(express.static(staticDir));

// Любой запрос отдаём index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер "Игра разума" запущен на порту ${PORT}`);
});
