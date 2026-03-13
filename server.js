const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ================== НАСТРОЙКИ ==================
const MAX_LEVEL = 30;
const DEFAULT_BALANCE = 1500000;
const PENALTY_BURN_RANGE = [15, 20];

// ================== ПУЛ ЗАДАНИЙ (РАСШИРЕННЫЙ) ==================
const taskTemplates = [
  // ... ваш полный пул заданий (см. предыдущие версии)
];

function createInitialPool() {
  const pool = [];
  const counts = [100, 60, 30, 20, 10, 2];
  for (let star = 1; star <= 6; star++) {
    const template = taskTemplates.find(t => t.difficulty === star);
    if (!template) continue;
    for (let i = 0; i < counts[star-1]; i++) {
      const text = template.texts[i % template.texts.length];
      pool.push({
        id: `task_${Date.now()}_${Math.random()}`,
        description: text,
        difficulty: star
      });
    }
  }
  return shuffle(pool);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function applyPenalty(pool) {
  const lightTasks = pool.filter(t => t.difficulty >= 1 && t.difficulty <= 3);
  if (lightTasks.length === 0) return 0;

  const burnCount = Math.floor(Math.random() * (PENALTY_BURN_RANGE[1] - PENALTY_BURN_RANGE[0] + 1)) + PENALTY_BURN_RANGE[0];
  const actualBurn = Math.min(burnCount, lightTasks.length);

  const weights = { 1: 5, 2: 3, 3: 2 };
  const totalWeight = 10;

  let remainingLight = [...lightTasks];

  for (let i = 0; i < actualBurn; i++) {
    if (remainingLight.length === 0) break;

    const rand = Math.random() * totalWeight;
    let chosenStar = 1;
    if (rand < 5) chosenStar = 1;
    else if (rand < 8) chosenStar = 2;
    else chosenStar = 3;

    const candidates = remainingLight.filter(t => t.difficulty === chosenStar);
    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      const taskToBurn = candidates[idx];
      
      const poolIndex = pool.findIndex(t => t.id === taskToBurn.id);
      if (poolIndex !== -1) pool.splice(poolIndex, 1);
      
      const lightIndex = remainingLight.findIndex(t => t.id === taskToBurn.id);
      if (lightIndex !== -1) remainingLight.splice(lightIndex, 1);
    } else {
      const anyTask = remainingLight[Math.floor(Math.random() * remainingLight.length)];
      const poolIndex = pool.findIndex(t => t.id === anyTask.id);
      if (poolIndex !== -1) pool.splice(poolIndex, 1);
      const lightIndex = remainingLight.findIndex(t => t.id === anyTask.id);
      if (lightIndex !== -1) remainingLight.splice(lightIndex, 1);
    }
  }

  return actualBurn;
}

let questState = {
  level: 1,
  availableTasks: createInitialPool(),
  currentCards: [],
  selectedTaskId: null,
  currentBalance: DEFAULT_BALANCE,
  balanceHistory: [],
  penaltiesLog: []
};

questState.balanceHistory.push({
  timestamp: Date.now(),
  desc: 'Стартовый баланс',
  change: DEFAULT_BALANCE,
  balance: DEFAULT_BALANCE
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Клиент подключён');
  socket.emit('state', questState);

  socket.on('completeTask', (taskId, change) => {
    const taskIndex = questState.availableTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      questState.availableTasks.splice(taskIndex, 1);
    }

    questState.currentBalance += change;
    questState.balanceHistory.push({
      timestamp: Date.now(),
      desc: `Задание выполнено`,
      change: change,
      balance: questState.currentBalance
    });

    io.emit('state', questState);
  });

  socket.on('penaltyWithBalance', (taskId, newBalance) => {
    const change = newBalance - questState.currentBalance;
    questState.currentBalance = newBalance;
    questState.balanceHistory.push({
      timestamp: Date.now(),
      desc: `Штраф (не выполнено)`,
      change: change,
      balance: questState.currentBalance
    });

    const burned = applyPenalty(questState.availableTasks);
    questState.balanceHistory.push({
      timestamp: Date.now(),
      desc: `Штраф: сгорело ${burned} лёгких заданий`,
      change: 0,
      balance: questState.currentBalance
    });

    io.emit('state', questState);
  });

  socket.on('prizeDraw', (data) => {
    const { amount, winners } = data;
    const total = amount * winners.length;
    questState.currentBalance -= total;
    questState.balanceHistory.push({
      timestamp: Date.now(),
      desc: `Розыгрыш: ${amount}₽ x ${winners.length} (${winners.join(', ')})`,
      change: -total,
      balance: questState.currentBalance
    });
    io.emit('state', questState);
  });

  socket.on('addBalance', (description, amount) => {
    questState.currentBalance += amount;
    questState.balanceHistory.push({
      timestamp: Date.now(),
      desc: description,
      change: amount,
      balance: questState.currentBalance
    });
    io.emit('state', questState);
  });

  socket.on('reset', (newBalance) => {
    const startBalance = (newBalance !== undefined && !isNaN(newBalance)) ? newBalance : DEFAULT_BALANCE;
    questState = {
      level: 1,
      availableTasks: createInitialPool(),
      currentCards: [],
      selectedTaskId: null,
      currentBalance: startBalance,
      balanceHistory: [{
        timestamp: Date.now(),
        desc: 'Стартовый баланс',
        change: startBalance,
        balance: startBalance
      }],
      penaltiesLog: []
    };
    io.emit('state', questState);
  });

  socket.on('loadSavedGame', (savedState) => {
    questState = {
      level: savedState.level || 1,
      availableTasks: savedState.availableTasks || createInitialPool(),
      currentCards: savedState.currentCards || [],
      selectedTaskId: savedState.selectedTaskId || null,
      currentBalance: savedState.currentBalance,
      balanceHistory: savedState.balanceHistory,
      penaltiesLog: savedState.penaltiesLog || []
    };
    io.emit('state', questState);
    console.log('Загружено сохранение');
  });

  socket.on('disconnect', () => console.log('Клиент отключён'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});








