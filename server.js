const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


const MAX_LEVEL = 40;
const DEFAULT_BALANCE = 1500000;
const PENALTY_BURN_RANGE = [15, 20]; // штраф 15-20 лёгких заданий


const taskTemplates = [
  // ⭐ 1 звезда (100 заданий)
  { difficulty: 1, texts: [
    'Сделать 20 спинов в Sweet Bonanza по 1000₽',
    'Купить бонус в Pirate‘s Pub за 20 000₽',
    'Купить бонус в Gates of Olympus за 30 000₽',
    'Два зрителя получают по 2000₽',
    'Сделать 10 спинов в любом Рыбаке (ставка 1000₽)',
    'Сделать 20 спинов в Coin Up (ставка 1000₽)',
    'Купить две «радуги» в Le King по 10 000₽',
    'Сделать 30 спинов в Wild West Gold (ставка 1000₽)',
    'Купить бонус в RIP City за 50 000₽',
    'Купить топовый бонус в Coin Volcano за 30 000₽',
    'Сделать 20 спинов в Cleocatra (ставка 1000₽)',
    'Сделать 10 спинов в Hot Fiesta (ставка 2000₽)',
    'Купить бонус в Hot Fiesta за 30 000₽',
    'Купить бонус в Money Train 4 за 30 000₽',
    'Купить бонус в Money Train 3 за 40 000₽',
    'Поставить 50 000₽ на красное в баккару',
    'Поставить 20 000₽ на 5 и 20 000₽ на 10 в Crazy Time',
    'Три зрителя получают по 3000₽',
    'Сделать 30 спинов в RIP City по 2000₽',
    'Купить топовый бонус в «Мумии» за 50 000₽',
    'Сделать 30 спинов в Dog House Multihold по 1000₽',
    'Купить топовый бонус в Big Bass Secrets of the Golden Lake за 40 000₽',
    'Купить бонус в Release the Kraken за 50 000₽',
    'Сделать 30 спинов в In Jazz по 1000₽',
    'Выбить обычный бонус в Le Fisherman (ставка 1000₽)',
    'Купить бонус в Wild West Gold Megaways за 40 000₽',
    'Сделать 30 спинов в Wild West Gold Megaways по 1000₽',
    'Сделать 20 спинов в 3 Buzzing Wilds по 2000₽',
    'Купить бонус в 3 Buzzing Wilds за 30 000₽',
    'Сделать 20 спинов в Dog House Royale Hunt по 2000₽',
    'Выбить бонус в любом Рыбаке (ставка от 1000₽)',
    'Купить топовый бонус в Dog House Muttley Crew за 30 000₽',
    'Купить две «радуги» в Ze Zeus за 20 000₽',
    'Сделать бездепозитное колесо на 10 000₽ на 5 минут',
    'Сделать депозитное колесо на 5 000₽ на 3 минуты',
    'Сделать бездепозитное колесо на 10 000₽ на 10 минут',
    'Поставить 30 000₽ на 5 в Crazy Time',
    'Выдать 5 000₽ одному зрителю',
    'Купить бонус в Gates of Olympus за 40 000₽',
    'Пройти до лягушки 3x3 в Wild Hop Drop в бонуске за 20 000₽ с первой попытки',
    'Поймать ретригер в Fonzo‘s Feline Fortune в бонуске за 20 000₽'
  ]},
  
  // ⭐⭐ 2 звезды (60 заданий)
  { difficulty: 2, texts: [
    'Поставить 30 000₽ в Crazy Time и выйти в плюс',
    'Поставить 40 000₽ на 2 в Crazy Time',
    'Купить бонус в Dead or Alive 2 за 50 000₽',
    'Сделать 10 спинов в Hot Fiesta по 4000₽',
    'Сделать 30 спинов в Sweet Bonanza по 3000₽',
    'Купить бонус в Gates of Olympus за 75 000₽',
    'Поставить 50 000₽ на любое число в Crazy time',
    'Сыграть 20 спинов в Dead or Alive 2 по 2000₽',
    'Выдать 10 000₽ одному зрителю',
    'Купить бонус в Big Bass Bonanza за 50 000₽',
    'Сделать 40 спинов в Book of Dead по 1500₽',
    'Поставить 25 000₽ на 5 и 25 000₽ на 10 в Crazy Time',
    'Купить бонус в Money Train 3 за 75 000₽',
    'Сделать 15 спинов в Le Bandit по 5000₽',
    'Купить топовый бонус в «Мумии» за 50 000₽ и выбить больше 10 спинов (макс. 3 попытки)',
    'Купить бонус в Sugar Rush за 60 000₽',
    'Купить бонус в Sugar Rush за 30 000₽ и выбить больше 3-х скаттеров (макс. 3 попытки)',
    'Купить бонус в Six Six Six и пробить больше 10 спинов в бонуске от 30 000₽',
    'Окупить бонус в Le Santa в бонуске от 20 000₽ (макс. 3 попытки)',
    'Сделать бездепозитное колесо на 20 000₽ на 10 минут',
    'Сделать депозитное колесо на 15 000₽ на 3 минуты',
    'Сделать депозитное колесо для больших депёров 5 000₽ для одного человека на 1 минуту',
    'Купить бонус в Densho за 30 000₽ и окупиться',
    'Купить бонуску в Cloud Princess за 30 000₽ и окупиться',
    'Купить бонус в любом «Рыбаке» и дойти до x2 в бонуске за 30 000₽ (2 попытки)',
    'Поймать линию вилдов в Hand of Midas 2 в бонуске за 20000₽',
    'Пройти до лягушки 4x4 в Wild Hop Drop в бонуске за 50000₽ (2 попытки)'
  ]},
  
  // ⭐⭐⭐ 3 звезды (30 заданий)
  { difficulty: 3, texts: [
    'Сделать 50 спинов в Gates of Olympus по 2000₽, спин должен сыграть с иксом',
    'Купить два бонуса в Hot Fiesta за 50 000₽ — один должен окупиться',
    'Сделать 50 спинов в Fortune of Giza (ставка 3000₽)',
    'Купить две «радуги» в Le Bandit по 50000₽ — хотя бы одна должна окупиться',
    'Сделать 30 спинов в Minotauros по 3000₽ и выбить бонус',
    'Сделать 100 спинов в Gates of Olympus по 3000₽',
    'Купить бонус в Sweet Bonanza за 100 000₽ и окупиться',
    'Выиграть 150 000₽ в любом слоте за одну бонуску',
    'Поставить 100 000₽ на чёрное и победить',
    'Сделать 50 спинов в Dead or Alive 2 по 4000₽',
    'Выдать 5 000₽ пяти зрителям',
    'Купить бонус в Money Train 4 за 100 000₽',
    'Поймать множитель x25 в Sweet Bonanza в бонуске за 40 000₽',
    'Поставить 100 000₽ в рулетке',
    'Выбить бонус в Le King за 40 спинов (ставка от 2 000₽)',
    'Дойти до метки 4x4 в Sky Bounty в бонуске за 50 000₽',
    'Выбить Super Scatter в Sweet Bonanza Super Scatter в бонуске за 50 000₽',
    'Купить бонус в Six Six Six и пробить больше 10 спинов в бонуске за 50 000₽',
    'Окупить бонус в Frkn Bananas в бонуске за 50 000₽ (макс. 2 попытки)',
    'Выбить топовый бонус в San Quentin в рандомке от 40 000₽ (макс. 3 попытки)',
    'Получить минимум 8x в Madame Destiny Megaways в бонуске за 50 000₽ (2 попытки)',
    'Купить бонус в любом «Рыбаке» и дойти до x3 в бонуске за 50 000₽ (2 попытки)',
    'Окупить бонус за 80 000₽ во Fruit Party с первой попытки',
    'Выбить x1000 в Big Bass Bonanza 1000 в бонуске за 45 000₽ (3 попытки)',
    'Поймать x200 в Wild West Gold в бонуске за 60 000₽(2 попытки)',
    'Поймать бонус в Big Bass Splash (ставка 2000₽) за 50 спинов',
    'Поймать 2 шторы в Angel vs Sinner в бонуске за 50 000₽ с первой попытки',
    'Купить топовый бонус в Sugar Rush 1000 за 100 000₽'
  ]},
  
  // ⭐⭐⭐⭐ 4 звезды (20 заданий)
  { difficulty: 4, texts: [
    'Поймать бонус в Sweet Bonanza (ставка от 4000₽)',
    'Выбить множитель x50 в Sweet Bonanza',
    'Выбить три бонуса в Le Bandit (ставка от 3000₽)',
    'Три зрителя получают по 7500₽',
    'Специальный пропуск: можно пропустить одно задание',
    'Разыграть в Telegram 2 бонуса за 50 000₽',
    'Выбить топовый бонус в «Мумии» с рандомки за 36000 за  за три попытки',
    'Взять рандомку в Duck Hunters за 200 000₽',
    'Поймать «под иксом» любую ставку в Crazy Time',
    'Поймать множитель x20-25 в Gates of Olympus в бонуске стоимость. от 40000₽',
    'Выбить три бонуса в любом «Рыбаке»',
    'Сделать 100 спинов в Le Fisherman по 4000₽ и выбить топовый бонус',
    '5 зрителей получают по 7500₽',
    'Купить бонус в Dead or Alive 2 за 200 000₽ — он должен дать минимум половину',
    'Сделать ставку 200 000₽ в лайв-игре',
    'Купить бонус в Dog House Multihold за 200 000₽ и окупиться',
    'Выиграть x200 в любом слоте с первой попытки',
    'Купить бонуску в слоте от No Limit за 200 000₽ — она должна дать минимум половину',
    'Сыграть 50 спинов в Le Bandit по 5 000₽ и выбить любой бонус',
    'Выбить снайпера в Money Train 4 в бонуске 75 000₽ (макс. 3 попытки)'
  ]},
  
  // ⭐⭐⭐⭐⭐ 5 звезд (10 заданий)
  { difficulty: 5, texts: [
    'Выбить множитель x100 в Sweet Bonanza',
    'All-in в Le Bandit',
    'All-in в Hot Fiesta',
    'Выиграть 500x в Sweet Bonanza (ставка 50 000₽)',
    'Выбить Crazy Time',
    'Выбить 2 топ-бонуса в Le Pharaon (ставка 3000₽)',
    'Поймать линию вилдов в Pirate‘s Pub',
    'Поймать x100 в Sweet Bonanza',
    'Купить бонус в Money Train 4 за 400 000₽',
    'Создатель получает накид'
  ]},
  
  // ⭐⭐⭐⭐⭐⭐ 6 звезд (2 задания)
  { difficulty: 6, texts: [
    'Выбить Hot Mode в Le Bandit (любая ставка)',
    'Поймать три десятки подряд в Crazy Time'
  ]}
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

function drawCards(pool, n, level) {
  if (pool.length < n) return [];

  let candidates = pool;

  if (level % 10 === 0) {
    // Уровни, кратные 10: только 4★,5★,6★
    const hard = pool.filter(t => t.difficulty >= 4);
    if (hard.length >= n) {
      candidates = hard;
    } else {
      const rest = pool.filter(t => t.difficulty < 4);
      candidates = hard.concat(rest);
    }
  } else if (level % 5 === 0) {
    // Уровни, кратные 5, но не кратные 10: только 3★ и 4★
    const mid = pool.filter(t => t.difficulty === 3 || t.difficulty === 4);
    if (mid.length >= n) {
      candidates = mid;
    } else {
      const rest = pool.filter(t => t.difficulty !== 3 && t.difficulty !== 4);
      candidates = mid.concat(rest);
    }
  }

  const shuffled = shuffle([...candidates]);
  const selected = shuffled.slice(0, n);
  for (let task of selected) {
    const index = pool.findIndex(t => t.id === task.id);
    if (index !== -1) pool.splice(index, 1);
  }
  return selected;
}

function applyPenalty(pool) {
  const lightTasks = pool.filter(t => t.difficulty >= 1 && t.difficulty <= 3);
  if (lightTasks.length === 0) return 0;

  const burnCount = Math.floor(Math.random() * (PENALTY_BURN_RANGE[1] - PENALTY_BURN_RANGE[0] + 1)) + PENALTY_BURN_RANGE[0];
  const actualBurn = Math.min(burnCount, lightTasks.length);

  // Вероятности: 50% 1★, 30% 2★, 20% 3★
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

questState.currentCards = drawCards(questState.availableTasks, 3, 1);
questState.balanceHistory.push({
  time: new Date().toLocaleTimeString(),
  desc: 'Стартовый баланс',
  change: DEFAULT_BALANCE,
  balance: DEFAULT_BALANCE
});


app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Клиент подключён');
  socket.emit('state', questState);

  socket.on('selectTask', (taskId) => {
    if (questState.selectedTaskId) return;
    const task = questState.currentCards.find(t => t.id === taskId);
    if (task && !task.selected && !task.completed) {
      const otherCards = questState.currentCards.filter(t => t.id !== taskId);
      for (let other of otherCards) {
        if (other.difficulty >= 4) {
          questState.availableTasks.push(other);
        }
      }
      questState.currentCards = [task];
      task.selected = true;
      questState.selectedTaskId = taskId;
      io.emit('state', questState);
    }
  });

  socket.on('completeTask', (taskId, change) => {
    const task = questState.currentCards.find(t => t.id === taskId);
    if (task && task.selected && !task.completed) {
      task.completed = true;
      questState.selectedTaskId = null;
      questState.currentBalance += change;
      questState.balanceHistory.push({
        time: new Date().toLocaleTimeString(),
        desc: `Уровень ${questState.level}: ${task.description.substring(0, 30)}...`,
        change: change,
        balance: questState.currentBalance
      });

      if (questState.level < MAX_LEVEL) {
        questState.level++;
        questState.currentCards = drawCards(questState.availableTasks, 3, questState.level);
        questState.selectedTaskId = null;
      } else {
        questState.currentCards = [];
      }
      io.emit('state', questState);
    }
  });

  socket.on('penaltyWithBalance', (taskId, newBalance) => {
    const task = questState.currentCards.find(t => t.id === taskId);
    if (task && task.selected && !task.completed) {
      const change = newBalance - questState.currentBalance;
      questState.currentBalance = newBalance;
      questState.balanceHistory.push({
        time: new Date().toLocaleTimeString(),
        desc: `Штраф (не выполнено): ${task.description.substring(0, 30)}...`,
        change: change,
        balance: questState.currentBalance
      });

      const burned = applyPenalty(questState.availableTasks);
      questState.balanceHistory.push({
        time: new Date().toLocaleTimeString(),
        desc: `Штраф: сгорело ${burned} лёгких заданий`,
        change: 0,
        balance: questState.currentBalance
      });

      if (questState.level < MAX_LEVEL) {
        questState.level++;
        questState.currentCards = drawCards(questState.availableTasks, 3, questState.level);
        questState.selectedTaskId = null;
      } else {
        questState.currentCards = [];
      }
      io.emit('state', questState);
    }
  });

  socket.on('applyPenalty', () => {
    const burned = applyPenalty(questState.availableTasks);
    questState.balanceHistory.push({
      time: new Date().toLocaleTimeString(),
      desc: `Штраф: сгорело ${burned} лёгких заданий`,
      change: 0,
      balance: questState.currentBalance
    });

    if (questState.level < MAX_LEVEL) {
      questState.level++;
      questState.currentCards = drawCards(questState.availableTasks, 3, questState.level);
      questState.selectedTaskId = null;
    } else {
      questState.currentCards = [];
    }
    io.emit('state', questState);
  });

  socket.on('prizeDraw', (data) => {
    const { amount, winners } = data;
    const total = amount * winners.length;
    questState.currentBalance -= total;
    questState.balanceHistory.push({
      time: new Date().toLocaleTimeString(),
      desc: `Розыгрыш: ${amount}₽ x ${winners.length} (${winners.join(', ')})`,
      change: -total,
      balance: questState.currentBalance
    });
    io.emit('state', questState);
  });

  socket.on('addBalance', (description, amount) => {
    questState.currentBalance += amount;
    questState.balanceHistory.push({
      time: new Date().toLocaleTimeString(),
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
        time: new Date().toLocaleTimeString(),
        desc: 'Стартовый баланс',
        change: startBalance,
        balance: startBalance
      }],
      penaltiesLog: []
    };
    questState.currentCards = drawCards(questState.availableTasks, 3, 1);
    io.emit('state', questState);
  });

  socket.on('disconnect', () => console.log('Клиент отключён'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});






