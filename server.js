const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Где искать index.html?
let staticDir = __dirname;
const searchPaths = [
    __dirname,                      // корень репозитория
    path.join(__dirname, 'public'), // папка public
    path.join(__dirname, 'src')     // папка src (вдруг)
];
for (const p of searchPaths) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
        staticDir = p;
        break;
    }
}

console.log(`✅ Статика из папки: ${staticDir}`);
app.use(express.static(staticDir));

// Все запросы → index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
