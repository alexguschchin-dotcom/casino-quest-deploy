const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Настройки игры
const MAX_LEVEL = 15;
const DEFAULT_GOLD = 0;
const SAFE_LEVELS = [5, 10, 15]; // несгораемые уровни
const PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];

// Задания для каждого уровня
const tasks = [
  { level: 1,  text: 'Сделайте 10 спинов в Sweet Bonanza по 100 золотых.' },
  { level: 2,  text: 'Поставьте 200 золотых на красное в рулетке.' },
  { level: 3,  text: 'Купите бонус в Gates of Olympus за 300 золотых.' },
  { level: 4,  text: 'Сыграйте 5 раундов в баккару по 100 золотых.' },
  { level: 5,  text: 'Сделайте 20 спинов в Book of Dead по 50 золотых.' },
  { level: 6,  text: 'Поставьте 500 золотых на число в рулетке.' },
  { level: 7,  text: 'Купите бонус в Money Train 3 за 800 золотых.' },
  { level: 8,  text: 'Сыграйте 10 раундов в покер (техасский холдем) по 200 золотых.' },
  { level: 9,  text: 'Сделайте 30 спинов в Starburst по 100 золотых.' },
  { level: 10, text: 'Поставьте 1000 золотых на «зеро» в рулетке.' },
  { level: 11, text: 'Купите бонус в Dead or Alive 2 за 1500 золотых.' },
  { level: 12, text: 'Сыграйте 5 раундов в лайв-игре Crazy Time по 500 золотых.' },
  { level: 13, text: 'Сделайте 50 спинов в Bonanza по 200 золотых.' },
  { level: 14, text: 'Поставьте 2000 золотых на «большое» в рулетке.' },
  { level: 15, text: 'Купите топовый бонус в Money Train 4 за 5000 золотых.' }
];

let gameState = {
  level: 1,
  gold: DEFAULT_GOLD,
  hints: {
    fifty: true,
    phone: true,
    audience: true
  },
  completed: false,
  lastSafeLevel: 0
};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Клиент подключён');
  socket.emit('init', { gameState, currentTask: tasks[gameState.level - 1] });

  // Обработка результата задания
  socket.on('submitResult', (newGold) => {
    if (gameState.completed) return;

    const change = newGold - gameState.gold;
    gameState.gold = newGold;

    if (change >= 0) {
      // Успех – переходим на следующий уровень
      if (gameState.level < MAX_LEVEL) {
        gameState.level++;
      } else {
        gameState.completed = true;
        socket.emit('gameOver', { win: true, gold: gameState.gold, level: gameState.level });
      }
    } else {
      // Провал – игра окончена
      gameState.completed = true;
      socket.emit('gameOver', { win: false, gold: gameState.gold, level: gameState.level });
    }

    socket.emit('update', { gameState, currentTask: tasks[gameState.level - 1] });
  });

  // Использование подсказки
  socket.on('useHint', (hintType) => {
    if (gameState.completed) return;

    if (hintType === 'fifty' && gameState.hints.fifty) {
      gameState.hints.fifty = false;
      // Логика 50/50: убираем самый сложный вариант? У нас нет вариантов. Можно пропустить текущее задание.
      // Вместо этого просто переходим на следующий уровень без изменения золота.
      if (gameState.level < MAX_LEVEL) {
        gameState.level++;
        socket.emit('update', { gameState, currentTask: tasks[gameState.level - 1] });
      } else {
        gameState.completed = true;
        socket.emit('gameOver', { win: true, gold: gameState.gold, level: gameState.level });
      }
    } else if (hintType === 'phone' && gameState.hints.phone) {
      gameState.hints.phone = false;
      // Звонок другу – открываем чат на 30 секунд (на клиенте)
      socket.emit('phoneHintActivated');
    } else if (hintType === 'audience' && gameState.hints.audience) {
      gameState.hints.audience = false;
      // Помощь зала – голосование в чате (на клиенте)
      socket.emit('audienceHintActivated');
    }
  });

  // Забрать выигрыш (на несгораемом уровне)
  socket.on('takeMoney', () => {
    if (SAFE_LEVELS.includes(gameState.level)) {
      gameState.completed = true;
      socket.emit('gameOver', { win: true, gold: gameState.gold, level: gameState.level, tookMoney: true });
    }
  });

  // Сброс игры
  socket.on('reset', () => {
    gameState = {
      level: 1,
      gold: DEFAULT_GOLD,
      hints: { fifty: true, phone: true, audience: true },
      completed: false,
      lastSafeLevel: 0
    };
    socket.emit('init', { gameState, currentTask: tasks[0] });
  });

  socket.on('disconnect', () => console.log('Клиент отключён'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер драконьего квеста запущен на порту ${PORT}`));




