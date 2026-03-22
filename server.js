const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Конфигурация
const TOTAL_TILES = 25; // 5x5 сетка
const DEFAULT_SCORE = 0;

// Задания (25 штук)
const tasks = [
  { id: 1, text: 'Сделайте 20 спинов в Book of Dead по 100 золотых.', type: 'casino' },
  { id: 2, text: 'Поставьте 500 золотых на красное в рулетке.', type: 'casino' },
  { id: 3, text: 'Купите бонус в Gates of Olympus за 1000 золотых.', type: 'casino' },
  { id: 4, text: 'Зрители: напишите в чат "Вспоминаем детство!" 10 раз.', type: 'chat' },
  { id: 5, text: 'Сыграйте 5 раундов в блэкджек (ставка 200).', type: 'casino' },
  { id: 6, text: 'Сделайте 30 спинов в Sweet Bonanza по 200 золотых.', type: 'casino' },
  { id: 7, text: 'Поставьте 1000 золотых на зеро в рулетке.', type: 'casino' },
  { id: 8, text: 'Купите бонус в Money Train 3 за 3000 золотых.', type: 'casino' },
  { id: 9, text: 'Зрители: отправьте 50 смайликов 🎲 в чат.', type: 'chat' },
  { id: 10, text: 'Сыграйте в лайв-рулетку 3 раза (ставка 500).', type: 'casino' },
  { id: 11, text: 'Сделайте 10 спинов в Starburst по 50 золотых.', type: 'casino' },
  { id: 12, text: 'Поставьте 2000 золотых на "большое" в рулетке.', type: 'casino' },
  { id: 13, text: 'Купите бонус в Dead or Alive 2 за 5000 золотых.', type: 'casino' },
  { id: 14, text: 'Зрители: напишите 3 комплимента стримеру.', type: 'chat' },
  { id: 15, text: 'Сыграйте 5 раундов в баккару по 300 золотых.', type: 'casino' },
  { id: 16, text: 'Сделайте 40 спинов в Razor Shark по 150 золотых.', type: 'casino' },
  { id: 17, text: 'Поставьте 4000 золотых на чёрное в рулетке.', type: 'casino' },
  { id: 18, text: 'Купите бонус в Wild West Gold за 7000 золотых.', type: 'casino' },
  { id: 19, text: 'Зрители: угадайте, какой фильм мы смотрели вместе?', type: 'chat' },
  { id: 20, text: 'Сделайте 50 спинов в Bonanza по 300 золотых.', type: 'casino' },
  { id: 21, text: 'Поставьте 5000 золотых на чёт в рулетке.', type: 'casino' },
  { id: 22, text: 'Купите бонус в Money Train 4 за 10000 золотых.', type: 'casino' },
  { id: 23, text: 'Зрители: напишите 5 воспоминаний о прошлых стримах.', type: 'chat' },
  { id: 24, text: 'Сделайте all-in в любимом слоте отца.', type: 'casino' },
  { id: 25, text: 'Финальное испытание: чат должен набрать 100 сообщений "Спасибо за игру!"', type: 'chat' }
];

let gameState = {
  completedTiles: Array(TOTAL_TILES).fill(false),
  currentTaskIndex: 0,
  gameFinished: false
};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Клиент подключился');

  // Отправляем начальное состояние
  socket.emit('init', { state: gameState, tasks });

  // Обработка успешного выполнения текущего задания
  socket.on('completeTask', (success) => {
    if (gameState.gameFinished) return;

    if (success) {
      // Открываем текущую клетку
      gameState.completedTiles[gameState.currentTaskIndex] = true;

      // Переходим к следующему заданию, если есть
      if (gameState.currentTaskIndex + 1 < TOTAL_TILES) {
        gameState.currentTaskIndex++;
      } else {
        gameState.gameFinished = true;
      }

      // Отправляем обновлённое состояние
      io.emit('update', { state: gameState, tasks });
    } else {
      // Провал: ничего не открывается, можно отправить уведомление
      socket.emit('failNotification', { message: 'Упс, не получилось. Попробуйте снова!' });
    }
  });

  // Запрос подсказки (опционально, для вовлечения чата)
  socket.on('askHint', () => {
    // Можно отправить подсказку, например, "Попробуйте увеличить ставку"
    socket.emit('hint', { message: 'Совет: попробуйте изменить ставку или выбрать другой слот.' });
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключился');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});



