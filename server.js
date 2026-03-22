const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ================== КОНФИГУРАЦИЯ ==================
const INITIAL_HEALTH = 100;
const INITIAL_FURY = 0;
const MAX_FURY = 100;
const FURY_GAIN_ON_SUCCESS = 15;
const FURY_LOSS_ON_FAIL = 10;
const SUPER_ATTACK_FURY_COST = 50;

// ================== ПУЛ ЗАДАНИЙ ==================
// Каждое задание имеет: id, текст, сложность (число от 1 до 5), базовый урон при успехе
// Урон может быть модифицирован в зависимости от действия
const taskPool = [
    { id: 't1', text: 'Сделать 20 спинов в Sweet Bonanza по 400', difficulty: 1, baseDamage: 12 },
    { id: 't2', text: 'Купить бонус в Gates of Olympus за 30 000', difficulty: 2, baseDamage: 18 },
    { id: 't3', text: '30 спинов в Coin Up (ставка 500)', difficulty: 1, baseDamage: 12 },
    { id: 't4', text: 'Купить бонус в RIP City за 8 000', difficulty: 2, baseDamage: 18 },
    { id: 't5', text: 'Увидеть x64 в Wild Skullz', difficulty: 3, baseDamage: 24 },
    { id: 't6', text: 'Купить бонус в Money Train 4 за 5 000', difficulty: 2, baseDamage: 18 },
    { id: 't7', text: 'Поставить 10 000 в любой live игре', difficulty: 1, baseDamage: 12 },
    { id: 't8', text: 'Купить топ-бонус в Big Bass Secrets', difficulty: 3, baseDamage: 24 },
    { id: 't9', text: 'Выбить обычный бонус в Le Fisherman (ставка 300)', difficulty: 2, baseDamage: 18 },
    { id: 't10', text: '30 спинов в Wild West Gold Megaways по 400', difficulty: 2, baseDamage: 18 },
    { id: 't11', text: 'Окупить бонус в Vampy party', difficulty: 3, baseDamage: 24 },
    { id: 't12', text: 'Выбить бонус в любом Рыбаке по 500', difficulty: 2, baseDamage: 18 },
    { id: 't13', text: 'Сделать бездепозитное колесо на 5 000', difficulty: 1, baseDamage: 12 },
    { id: 't14', text: 'Сделать депозитное колесо на 5 000', difficulty: 2, baseDamage: 18 },
    { id: 't15', text: 'Поставить 5 000 в Crazy Time и выйти в плюс', difficulty: 3, baseDamage: 24 },
    { id: 't16', text: '20 спинов в Hot Fiesta по 625', difficulty: 2, baseDamage: 18 },
    { id: 't17', text: 'Купить бонус в Wanted Dead or a Wild 2 за 8 000', difficulty: 3, baseDamage: 24 },
    { id: 't18', text: 'Купить бонус в Sweet Bonanza — найти x10', difficulty: 3, baseDamage: 24 },
    { id: 't19', text: 'Поставить 7 000 на число в рулетке', difficulty: 2, baseDamage: 18 },
    { id: 't20', text: 'Выдать 3 000 одному зрителю', difficulty: 1, baseDamage: 12 },
    { id: 't21', text: 'Купить бонус в Yeti Quest за 8 000', difficulty: 2, baseDamage: 18 },
    { id: 't22', text: 'Купить бонус в Iron Bank и получить x2', difficulty: 3, baseDamage: 24 },
    { id: 't23', text: 'Выбить топ-бонус в Мумии за 7 200 (2 попытки)', difficulty: 3, baseDamage: 24 },
    { id: 't24', text: 'Выбить 2 шторы в Angel vs Sinner (2 попытки)', difficulty: 3, baseDamage: 24 },
    { id: 't25', text: 'Бонус Sugar Rush за 6 400, выбить >3 скаттеров', difficulty: 3, baseDamage: 24 },
    { id: 't26', text: 'Бонус Six Six Six за 10 000, пробить >10 спинов', difficulty: 4, baseDamage: 30 },
    { id: 't27', text: 'Окупить бонус в Le Santa за 5 000', difficulty: 2, baseDamage: 18 },
    { id: 't28', text: '30 спинов в Gates of Olympus по 1 000', difficulty: 2, baseDamage: 18 },
    { id: 't29', text: 'Два бонуса в Hot Fiesta за 10 000 каждый (хоть один окупной)', difficulty: 3, baseDamage: 24 },
    { id: 't30', text: '30 спинов в Fortune of Giza (ставка 800)', difficulty: 2, baseDamage: 18 },
    { id: 't31', text: '30 спинов в Minotauros по 800', difficulty: 2, baseDamage: 18 },
    { id: 't32', text: '100 спинов в Gates of Olympus по 500', difficulty: 3, baseDamage: 24 },
    { id: 't33', text: 'Окупить бонус в Sweet Bonanza за 16 000', difficulty: 3, baseDamage: 24 },
    { id: 't34', text: 'Выиграть 20 000 в любом слоте за одну бонуску', difficulty: 4, baseDamage: 30 },
    { id: 't35', text: 'Поставить 20 000 на чёрное и победить', difficulty: 3, baseDamage: 24 },
    { id: 't36', text: 'Бонус в Money Train 4 за 20 000', difficulty: 4, baseDamage: 30 },
    { id: 't37', text: 'Поймать множитель x25 в Sweet Bonanza', difficulty: 4, baseDamage: 30 },
    { id: 't38', text: 'Поставить 30 000 в рулетке', difficulty: 3, baseDamage: 24 },
    { id: 't39', text: 'Выбить бонус в Le King за 50 спинов', difficulty: 3, baseDamage: 24 },
    { id: 't40', text: 'Бонус Six Six Six, пробить >10 спинов (ставка от 10 000)', difficulty: 4, baseDamage: 30 },
    { id: 't41', text: 'Окупить бонус в Frkn Bananas (ставка 12 000, 2 попытки)', difficulty: 4, baseDamage: 30 },
    { id: 't42', text: 'Поймать x1000 в Big Bass Bonanza 1000', difficulty: 5, baseDamage: 40 },
    { id: 't43', text: 'Поймать x200 в Wild West Gold', difficulty: 4, baseDamage: 30 },
    { id: 't44', text: 'Выбить множитель x100 в Sweet Bonanza', difficulty: 5, baseDamage: 40 },
    { id: 't45', text: 'All-in в Le Bandit', difficulty: 5, baseDamage: 40 },
    { id: 't46', text: 'All-in в Hot Fiesta', difficulty: 5, baseDamage: 40 },
    { id: 't47', text: 'Выбить Crazy Time', difficulty: 5, baseDamage: 40 },
    { id: 't48', text: 'Купить бонус в Money Train 4 за 60 000', difficulty: 5, baseDamage: 40 },
    { id: 't49', text: 'Пробить Hot Mode в Le cowboy', difficulty: 5, baseDamage: 40 },
    { id: 't50', text: 'Выбить красную луну в The Vampires 2', difficulty: 5, baseDamage: 40 }
];

// ================== СОСТОЯНИЕ БОЯ ==================
let battleState = {
    // Гладиатор (стример)
    player: {
        health: INITIAL_HEALTH,
        fury: INITIAL_FURY,
        lastAction: null
    },
    // Противник (Теневой капитан)
    enemy: {
        health: INITIAL_HEALTH,
        name: 'Теневой капитан',
        // Противник будет выбирать действия случайно
    },
    currentTurn: 'player', // 'player' или 'enemy'
    currentAction: null,   // выбранное действие в текущем ходу
    currentTask: null,     // задание, связанное с действием
    round: 0,
    battleActive: true,
    winner: null,          // 'player' или 'enemy'
    history: []            // лог боя
};

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getRandomTask(minDifficulty = 1, maxDifficulty = 5) {
    const filtered = taskPool.filter(t => t.difficulty >= minDifficulty && t.difficulty <= maxDifficulty);
    if (filtered.length === 0) return taskPool[0];
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return { ...filtered[randomIndex] };
}

// Генерация задания в зависимости от выбранного действия
function generateTaskForAction(action) {
    let minDiff = 1, maxDiff = 5;
    switch (action) {
        case 'attack':
            minDiff = 2; maxDiff = 4;
            break;
        case 'defend':
            minDiff = 1; maxDiff = 3;
            break;
        case 'dodge':
            minDiff = 1; maxDiff = 2;
            break;
        case 'fury':
            minDiff = 1; maxDiff = 3;
            break;
        case 'super':
            minDiff = 4; maxDiff = 5;
            break;
        default: minDiff = 1; maxDiff = 3;
    }
    return getRandomTask(minDiff, maxDiff);
}

// Применить успех действия
function applySuccess(action, task) {
    let damage = task.baseDamage;
    let furyGain = FURY_GAIN_ON_SUCCESS;
    let effectMessage = '';

    switch (action) {
        case 'attack':
            battleState.enemy.health -= damage;
            effectMessage = `⚔️ Атака! Нанесено ${damage} урона Теневому капитану!`;
            break;
        case 'defend':
            // Защита не наносит урон, но даёт бафф на следующий ход
            battleState.player.lastAction = 'defend';
            effectMessage = `🛡️ Защита активирована! Следующий урон по вам уменьшен на 50%.`;
            break;
        case 'dodge':
            battleState.player.lastAction = 'dodge';
            effectMessage = `💨 Уворот! Следующая атака противника будет полностью пропущена.`;
            break;
        case 'fury':
            battleState.player.fury = Math.min(battleState.player.fury + furyGain, MAX_FURY);
            effectMessage = `⚡ Накопление ярости! +${furyGain} ярости (теперь ${battleState.player.fury}).`;
            break;
        case 'super':
            if (battleState.player.fury >= SUPER_ATTACK_FURY_COST) {
                battleState.player.fury -= SUPER_ATTACK_FURY_COST;
                battleState.enemy.health -= damage * 2; // суперудар наносит двойной урон
                effectMessage = `💥 СУПЕРУДАР! Нанесено ${damage * 2} урона Теневому капитану!`;
            } else {
                // Если ярости недостаточно, считаем провалом
                effectMessage = `❌ Недостаточно ярости для суперудара! Действие провалено.`;
                applyFail(action, task);
                return;
            }
            break;
        default: break;
    }

    addHistoryEntry(effectMessage);
    // Проверка победы
    if (battleState.enemy.health <= 0) {
        battleState.enemy.health = 0;
        battleState.winner = 'player';
        battleState.battleActive = false;
        addHistoryEntry('🏆 Вы победили Теневого капитана! Слава гладиатору!');
        io.emit('battleEnd', { winner: 'player' });
        return;
    }
    // Если игрок выполнил действие, переходим к ходу врага
    battleState.currentTurn = 'enemy';
    scheduleEnemyTurn();
}

// Применить провал действия
function applyFail(action, task) {
    let damage = task.baseDamage / 2; // провал наносит половину урона
    let furyLoss = FURY_LOSS_ON_FAIL;
    let effectMessage = '';

    switch (action) {
        case 'attack':
            battleState.player.health -= damage;
            effectMessage = `💔 Атака провалена! Вы получаете ${damage} урона.`;
            break;
        case 'defend':
            battleState.player.health -= damage;
            effectMessage = `💔 Защита не удалась! Вы получаете ${damage} урона.`;
            break;
        case 'dodge':
            battleState.player.health -= damage;
            effectMessage = `💔 Уворот не сработал! Вы получаете ${damage} урона.`;
            break;
        case 'fury':
            battleState.player.fury = Math.max(0, battleState.player.fury - furyLoss);
            effectMessage = `😖 Провал! Потеряно ${furyLoss} ярости (теперь ${battleState.player.fury}).`;
            break;
        case 'super':
            // Провал суперудара наносит урон игроку и не тратит ярость
            battleState.player.health -= damage * 2;
            effectMessage = `💀 Суперудар провален! Вы получаете ${damage * 2} урона!`;
            break;
        default: break;
    }

    addHistoryEntry(effectMessage);
    if (battleState.player.health <= 0) {
        battleState.player.health = 0;
        battleState.winner = 'enemy';
        battleState.battleActive = false;
        addHistoryEntry('💀 Вы повержены! Теневой капитан одержал победу.');
        io.emit('battleEnd', { winner: 'enemy' });
        return;
    }
    battleState.currentTurn = 'enemy';
    scheduleEnemyTurn();
}

function addHistoryEntry(message) {
    battleState.history.push({
        timestamp: Date.now(),
        text: message
    });
    if (battleState.history.length > 50) battleState.history.shift();
}

// Ход врага (случайное действие, автоматический урон)
function enemyTurn() {
    if (!battleState.battleActive || battleState.currentTurn !== 'enemy') return;

    const actions = ['attack', 'defend', 'fury']; // враг может атаковать, защищаться или копить ярость
    const chosen = actions[Math.floor(Math.random() * actions.length)];
    let damage = 0;
    let message = '';

    // Учитываем защиту/уворот игрока
    let playerDefense = false;
    let playerDodge = false;
    if (battleState.player.lastAction === 'defend') {
        playerDefense = true;
        battleState.player.lastAction = null;
    }
    if (battleState.player.lastAction === 'dodge') {
        playerDodge = true;
        battleState.player.lastAction = null;
    }

    switch (chosen) {
        case 'attack':
            damage = Math.floor(Math.random() * 20) + 10; // 10-30 урона
            if (playerDefense) damage = Math.floor(damage / 2);
            if (playerDodge) {
                message = '💨 Вы увернулись от атаки противника! Урон не получен.';
                damage = 0;
            } else {
                message = `⚔️ Теневой капитан атакует! Вы получаете ${damage} урона.`;
            }
            battleState.player.health -= damage;
            break;
        case 'defend':
            // Враг защищается, ничего не делает, но мы можем добавить сообщение
            message = '🛡️ Теневой капитан защищается!';
            break;
        case 'fury':
            battleState.enemy.fury = (battleState.enemy.fury || 0) + 15;
            message = `⚡ Теневой капитан накапливает ярость (теперь ${battleState.enemy.fury}).`;
            break;
        default: break;
    }

    if (damage > 0) {
        addHistoryEntry(message);
    } else if (message) {
        addHistoryEntry(message);
    } else {
        addHistoryEntry('Теневой капитан пропускает ход...');
    }

    if (battleState.player.health <= 0) {
        battleState.player.health = 0;
        battleState.winner = 'enemy';
        battleState.battleActive = false;
        addHistoryEntry('💀 Вы повержены! Теневой капитан одержал победу.');
        io.emit('battleEnd', { winner: 'enemy' });
        return;
    }

    // Завершаем ход врага, переключаемся на игрока
    battleState.currentTurn = 'player';
    // Генерируем новый набор карточек для игрока
    generatePlayerActions();
    io.emit('battleState', battleState);
}

function scheduleEnemyTurn() {
    setTimeout(() => {
        enemyTurn();
    }, 1500);
}

// Генерация доступных действий для игрока (карточки)
function generatePlayerActions() {
    if (!battleState.battleActive) return;

    const actions = [
        { id: 'attack', name: 'Атака', description: 'Нанести урон, выполнив задание средней сложности.' },
        { id: 'defend', name: 'Защита', description: 'Уменьшить следующий урон от врага на 50%.' },
        { id: 'dodge', name: 'Уворот', description: 'Полностью избежать следующей атаки врага.' },
        { id: 'fury', name: 'Накопление ярости', description: 'Увеличить ярость на 15.' }
    ];

    if (battleState.player.fury >= SUPER_ATTACK_FURY_COST) {
        actions.push({ id: 'super', name: 'Суперудар', description: 'Нанести двойной урон, потратив 50 ярости.' });
    }

    battleState.currentActions = actions;
}

// Начать новый бой (сброс состояния)
function resetBattle() {
    battleState = {
        player: {
            health: INITIAL_HEALTH,
            fury: INITIAL_FURY,
            lastAction: null
        },
        enemy: {
            health: INITIAL_HEALTH,
            name: 'Теневой капитан',
        },
        currentTurn: 'player',
        currentAction: null,
        currentTask: null,
        round: 0,
        battleActive: true,
        winner: null,
        history: [],
        currentActions: []
    };
    generatePlayerActions();
    io.emit('battleState', battleState);
}

// ================== SOCKET.IO ==================
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Клиент подключён');
    socket.emit('battleState', battleState);

    // Игрок выбирает действие
    socket.on('chooseAction', (actionId) => {
        if (!battleState.battleActive || battleState.currentTurn !== 'player') {
            socket.emit('error', 'Сейчас не ваш ход или бой окончен');
            return;
        }
        // Найти выбранное действие
        const action = battleState.currentActions.find(a => a.id === actionId);
        if (!action) {
            socket.emit('error', 'Недопустимое действие');
            return;
        }
        battleState.currentAction = actionId;
        // Генерируем задание для этого действия
        const task = generateTaskForAction(actionId);
        battleState.currentTask = task;
        // Отправляем клиенту задание на выполнение
        socket.emit('taskForAction', { actionId, task });
    });

    // Результат выполнения задания (успех/провал)
    socket.on('taskResult', ({ success }) => {
        if (!battleState.battleActive || battleState.currentTurn !== 'player') {
            socket.emit('error', 'Неверное время для отчёта о задании');
            return;
        }
        const action = battleState.currentAction;
        const task = battleState.currentTask;
        if (!action || !task) {
            socket.emit('error', 'Нет активного действия');
            return;
        }

        if (success) {
            applySuccess(action, task);
        } else {
            applyFail(action, task);
        }

        // Очищаем текущие данные действия
        battleState.currentAction = null;
        battleState.currentTask = null;

        // Отправляем обновлённое состояние боя всем клиентам
        io.emit('battleState', battleState);
    });

    // Запрос на сброс боя (администратор или стример)
    socket.on('resetBattle', () => {
        resetBattle();
    });

    // Зрительские голосования (простейшая реализация: голосуем за действие)
    // Храним текущие голоса в памяти
    if (!battleState.votes) battleState.votes = {};

    socket.on('vote', (actionId) => {
        // Учитываем голос, но для упрощения просто сохраняем, а стример может увидеть итоги
        if (!battleState.votes[actionId]) battleState.votes[actionId] = 0;
        battleState.votes[actionId]++;
        // Отправляем обновлённые голоса всем
        io.emit('votesUpdate', battleState.votes);
    });

    // Принудительное завершение боя (для тестов)
    socket.on('forceWin', () => {
        if (!battleState.battleActive) return;
        battleState.enemy.health = 0;
        battleState.winner = 'player';
        battleState.battleActive = false;
        addHistoryEntry('🏆 Победа принудительно засчитана!');
        io.emit('battleState', battleState);
        io.emit('battleEnd', { winner: 'player' });
    });

    socket.on('disconnect', () => {
        console.log('Клиент отключён');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});



