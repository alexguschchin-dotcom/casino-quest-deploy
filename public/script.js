const socket = io();

// Состояние игры
let gameState = {
    playerHand: [],          // массив карт игрока (объекты с id, difficulty, description)
    opponentHand: [],        // массив карт противника (id, difficulty) — описание не храним до открытия
    playerScore: 0,
    opponentScore: 0,
    round: 1,
    currentBalance: 1500000,
    balanceHistory: [],
    availableTasks: [],      // локальная копия пула заданий
    currentTaskId: null,
    gameCompleted: false,
    // Трофеи
    trophies: {
        heartMaster: false,      // выполнено 3♥ подряд
        diamondMaster: false,    // 3♦ подряд
        clubMaster: false,       // 3♣ подряд
        spadeMaster: false,      // 3♠ подряд
        noFail: false,           // 10 раундов без штрафа
        tournamentWinner: false, // победа в турнире
        collector: false,        // по 5 каждой масти
        winStreak: 0,            // счётчик побед подряд
        collection: { heart: 0, diamond: 0, club: 0, spade: 0 } // выполнено каждой масти
    },
    failStreak: 0,               // счётчик раундов без штрафа (для трофея)
    lastSuits: [],               // последние 3 масти для проверки комбо
};

// DOM элементы
const balanceSpan = document.getElementById('current-balance');
const playerScoreSpan = document.getElementById('player-score');
const opponentScoreSpan = document.getElementById('opponent-score');
const roundSpan = document.getElementById('round-count');
const historyDiv = document.getElementById('history-list');
const poolStatsDiv = document.getElementById('pool-stats');
const playerHandDiv = document.getElementById('player-hand');
const opponentHandDiv = document.getElementById('opponent-hand');
const resetBtn = document.getElementById('reset-btn');
const rulesBtn = document.getElementById('rules-btn');
const applyBalanceBtn = document.getElementById('apply-start-balance');
const taskModal = document.getElementById('task-modal');
const taskDesc = document.getElementById('task-description');
const newBalanceInput = document.getElementById('new-balance');
const completeBtn = document.getElementById('complete-task');
const failBtn = document.getElementById('fail-task');
const completionModal = document.getElementById('completion-modal');
const finalMessage = document.getElementById('final-message');
const finalBalanceSpan = document.getElementById('final-balance');
const completionResetBtn = document.getElementById('completion-reset-btn');
const rulesModal = document.getElementById('rules-modal');
const dontShowCheckbox = document.getElementById('dont-show-rules');
const startQuestBtn = document.getElementById('start-quest-btn');

// Ключ сохранения
const SAVE_KEY = 'tournament_save';

// ------------------- Преобразование difficulty в масть и очки -------------------
function difficultyToSuit(diff) {
    if (diff <= 1) return '♥';   // 1★
    if (diff === 2) return '♦';   // 2★
    if (diff === 3) return '♣';   // 3★
    return '♠';                   // 4★ и выше (объединяем)
}

function difficultyToPoints(diff) {
    if (diff <= 1) return 1;
    if (diff === 2) return 2;
    if (diff === 3) return 3;
    return 4; // для 4★ и выше
}

// ------------------- Вспомогательные функции -------------------
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Взять случайную карту из пула и удалить её из gameState.availableTasks
function drawCardFromPool() {
    if (gameState.availableTasks.length === 0) return null;
    const index = Math.floor(Math.random() * gameState.availableTasks.length);
    const card = gameState.availableTasks[index];
    gameState.availableTasks.splice(index, 1);
    return card;
}

// Инициализация рук (раздача по 3 карты)
function initHands() {
    gameState.playerHand = [];
    gameState.opponentHand = [];
    for (let i = 0; i < 3; i++) {
        const playerCard = drawCardFromPool();
        if (playerCard) gameState.playerHand.push(playerCard);
        const opponentCard = drawCardFromPool();
        if (opponentCard) gameState.opponentHand.push(opponentCard);
    }
    renderHands();
    updatePoolStats();
}

// Ход противника (открыть одну карту, начислить очки, убрать, добить новую)
function opponentTurn() {
    if (gameState.opponentHand.length === 0) return;
    // Выбираем случайную карту из руки противника
    const index = Math.floor(Math.random() * gameState.opponentHand.length);
    const card = gameState.opponentHand[index];
    gameState.opponentHand.splice(index, 1);
    
    // Начисляем очки (по масти)
    const points = difficultyToPoints(card.difficulty);
    gameState.opponentScore += points;
    opponentScoreSpan.textContent = gameState.opponentScore;
    
    // Добавляем запись в историю
    const suit = difficultyToSuit(card.difficulty);
    addHistoryEntry(`🤖 Противник открыл ${suit} (${points} очк.)`);
    
    // Добираем новую карту, если есть
    const newCard = drawCardFromPool();
    if (newCard) gameState.opponentHand.push(newCard);
    
    renderHands();
    updatePoolStats();
}

// Добавить запись в историю
function addHistoryEntry(text) {
    const entry = document.createElement('div');
    entry.className = 'history-item';
    entry.textContent = text;
    historyDiv.appendChild(entry);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

// Обновление статистики пула (по мастям)
function updatePoolStats() {
    const counts = { '♥': 0, '♦': 0, '♣': 0, '♠': 0 };
    gameState.availableTasks.forEach(task => {
        const suit = difficultyToSuit(task.difficulty);
        counts[suit]++;
    });
    poolStatsDiv.innerHTML = `
        <div class="pool-stat"><span class="suit ♥">♥</span> ${counts['♥']}</div>
        <div class="pool-stat"><span class="suit ♦">♦</span> ${counts['♦']}</div>
        <div class="pool-stat"><span class="suit ♣">♣</span> ${counts['♣']}</div>
        <div class="pool-stat"><span class="suit ♠">♠</span> ${counts['♠']}</div>
    `;
}

// Отрисовка рук
function renderHands() {
    // Рука игрока
    playerHandDiv.innerHTML = '';
    gameState.playerHand.forEach((card, idx) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = idx;
        const suit = difficultyToSuit(card.difficulty);
        cardEl.innerHTML = `
            <div class="card-back">🃏</div>
            <div class="card-front" style="display: none;">
                <div class="suit ${suit}">${suit}</div>
                <div class="task-text">${card.description.substring(0, 20)}…</div>
            </div>
        `;
        cardEl.addEventListener('click', () => selectPlayerCard(idx));
        playerHandDiv.appendChild(cardEl);
    });

    // Рука противника (все рубашкой вверх)
    opponentHandDiv.innerHTML = '';
    gameState.opponentHand.forEach(() => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<div class="card-back">🃏</div>`;
        opponentHandDiv.appendChild(cardEl);
    });
}

// Выбор карты игроком
function selectPlayerCard(index) {
    if (gameState.playerHand.length <= index) return;
    const card = gameState.playerHand[index];
    gameState.currentTaskId = card.id;
    taskDesc.textContent = card.description;
    newBalanceInput.value = gameState.currentBalance;
    taskModal.classList.remove('hidden');
    
    // Сохраняем выбранную карту для последующего удаления
    window.selectedCardIndex = index;
}

// Проверка трофеев
function checkTrophies(cardSuit, success) {
    if (!success) {
        // Если провал, сбрасываем счётчик безштрафных раундов
        gameState.failStreak = 0;
        return;
    }
    
    // Увеличиваем счётчик безштрафных раундов
    gameState.failStreak++;
    if (gameState.failStreak >= 10 && !gameState.trophies.noFail) {
        gameState.trophies.noFail = true;
        addHistoryEntry('🏆 Получен трофей "Без единого провала"!');
        renderTrophies();
    }
    
    // Обновляем коллекцию мастей
    if (cardSuit === '♥') gameState.trophies.collection.heart++;
    if (cardSuit === '♦') gameState.trophies.collection.diamond++;
    if (cardSuit === '♣') gameState.trophies.collection.club++;
    if (cardSuit === '♠') gameState.trophies.collection.spade++;
    
    // Проверка на коллекционера (по 5 каждой масти)
    const coll = gameState.trophies.collection;
    if (!gameState.trophies.collector && coll.heart >=5 && coll.diamond >=5 && coll.club >=5 && coll.spade >=5) {
        gameState.trophies.collector = true;
        addHistoryEntry('🏆 Получен трофей "Коллекционер"!');
        renderTrophies();
    }
    
    // Проверка на мастеров мастей (3 подряд одной масти)
    gameState.lastSuits.push(cardSuit);
    if (gameState.lastSuits.length > 3) gameState.lastSuits.shift();
    
    if (gameState.lastSuits.length === 3) {
        const [s1, s2, s3] = gameState.lastSuits;
        if (s1 === s2 && s2 === s3) {
            const trophyKey = {
                '♥': 'heartMaster',
                '♦': 'diamondMaster',
                '♣': 'clubMaster',
                '♠': 'spadeMaster'
            }[s1];
            if (!gameState.trophies[trophyKey]) {
                gameState.trophies[trophyKey] = true;
                addHistoryEntry(`🏆 Получен трофей "Мастер ${s1}"!`);
                renderTrophies();
            }
        }
    }
}

// Отрисовка трофеев
function renderTrophies() {
    const trophiesList = document.getElementById('trophies-list');
    if (!trophiesList) return;
    const trophies = gameState.trophies;
    let html = '';
    if (trophies.heartMaster) html += '<span class="trophy" title="Мастер ♥">♥</span>';
    if (trophies.diamondMaster) html += '<span class="trophy" title="Мастер ♦">♦</span>';
    if (trophies.clubMaster) html += '<span class="trophy" title="Мастер ♣">♣</span>';
    if (trophies.spadeMaster) html += '<span class="trophy" title="Мастер ♠">♠</span>';
    if (trophies.noFail) html += '<span class="trophy" title="Без единого провала">🛡️</span>';
    if (trophies.tournamentWinner) html += '<span class="trophy" title="Победитель турнира">🏆</span>';
    if (trophies.collector) html += '<span class="trophy" title="Коллекционер">📚</span>';
    trophiesList.innerHTML = html;
}

// Завершение задания (успех/провал)
function completeTask(success) {
    const newBalance = parseFloat(newBalanceInput.value);
    if (isNaN(newBalance)) return;
    
    const change = newBalance - gameState.currentBalance;
    const cardIndex = window.selectedCardIndex;
    const card = gameState.playerHand[cardIndex];
    const suit = difficultyToSuit(card.difficulty);
    
    // Удаляем карту из руки игрока
    gameState.playerHand.splice(cardIndex, 1);
    
    // Добавляем очки игроку (по масти)
    const points = difficultyToPoints(card.difficulty);
    if (success) {
        gameState.playerScore += points;
        playerScoreSpan.textContent = gameState.playerScore;
        addHistoryEntry(`✅ Вы выполнили задание (${points} очк.)`);
    } else {
        addHistoryEntry(`❌ Вы провалили задание (0 очк.)`);
    }
    
    // Отправляем событие на сервер
    if (success) {
        socket.emit('completeTask', card.id, change);
        checkTrophies(suit, true);
    } else {
        socket.emit('penaltyWithBalance', card.id, newBalance);
        checkTrophies(null, false);
    }
    
    // Добираем новую карту игроку
    const newCard = drawCardFromPool();
    if (newCard) gameState.playerHand.push(newCard);
    
    // Ход противника
    opponentTurn();
    
    // Увеличиваем счётчик раундов
    gameState.round++;
    roundSpan.textContent = gameState.round;
    
    // Проверка на завершение игры (30 раундов)
    if (gameState.round > 30 || gameState.availableTasks.length === 0) {
        endGame();
    }
    
    renderHands();
    updatePoolStats();
    taskModal.classList.add('hidden');
}

// Завершение игры
function endGame() {
    gameState.gameCompleted = true;
    let message = '';
    if (gameState.playerScore > gameState.opponentScore) {
        message = '🏆 Вы победили!';
        gameState.trophies.tournamentWinner = true;
        gameState.trophies.winStreak++;
        addHistoryEntry(`🏆 Победная серия: ${gameState.trophies.winStreak}`);
        renderTrophies();
    } else if (gameState.playerScore < gameState.opponentScore) {
        message = '😔 Противник оказался сильнее...';
        gameState.trophies.winStreak = 0;
    } else {
        message = '🤝 Ничья!';
        gameState.trophies.winStreak = 0;
    }
    finalMessage.textContent = message;
    finalBalanceSpan.textContent = gameState.currentBalance;
    completionModal.classList.remove('hidden');
}

// Сброс игры
function resetGame() {
    gameState.playerHand = [];
    gameState.opponentHand = [];
    gameState.playerScore = 0;
    gameState.opponentScore = 0;
    gameState.round = 1;
    gameState.currentBalance = 1500000;
    gameState.balanceHistory = [];
    gameState.gameCompleted = false;
    gameState.failStreak = 0;
    gameState.lastSuits = [];
    // Трофеи не сбрасываем, кроме тех, что зависят от сессии (победная серия уже сброшена)
    
    // Запрашиваем новый пул у сервера
    socket.emit('reset', gameState.currentBalance);
    
    // Очистим историю
    historyDiv.innerHTML = '';
    roundSpan.textContent = '1';
    playerScoreSpan.textContent = '0';
    opponentScoreSpan.textContent = '0';
    balanceSpan.textContent = gameState.currentBalance;
    renderTrophies();
}

// ------------------- Подключение к серверу -------------------
socket.on('connect', () => {
    const saved = loadGameState();
    if (saved && !saved.gameCompleted) {
        if (confirm('Найден сохранённый турнир. Восстановить?')) {
            gameState = saved;
            updateUI();
            renderHands();
            updatePoolStats();
            renderTrophies();
            return;
        } else {
            clearSave();
        }
    }
    socket.emit('reset', 1500000);
});

socket.on('state', (serverState) => {
    gameState.currentBalance = serverState.currentBalance;
    gameState.balanceHistory = serverState.balanceHistory;
    gameState.availableTasks = serverState.availableTasks; // копируем пул
    balanceSpan.textContent = gameState.currentBalance;
    
    // Если руки пусты (первый запуск), инициализируем
    if (gameState.playerHand.length === 0 && gameState.availableTasks.length > 0) {
        initHands();
    }
    renderHistory();
    updatePoolStats();
    renderTrophies();
    saveGame();
});

function renderHistory() {
    historyDiv.innerHTML = '';
    gameState.balanceHistory.slice().reverse().forEach(entry => {
        const date = new Date(entry.timestamp);
        const time = date.toLocaleTimeString();
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<strong>${time}</strong> ${entry.desc} (${entry.change > 0 ? '+' : ''}${entry.change})`;
        historyDiv.appendChild(div);
    });
}

function updateUI() {
    balanceSpan.textContent = gameState.currentBalance;
    playerScoreSpan.textContent = gameState.playerScore;
    opponentScoreSpan.textContent = gameState.opponentScore;
    roundSpan.textContent = gameState.round;
}

// ------------------- Сохранение и загрузка -------------------
function saveGame() {
    try {
        const saveData = {
            ...gameState,
            timestamp: Date.now()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {}
}

function loadGameState() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return null;
        const data = JSON.parse(saved);
        if (Date.now() - data.timestamp > 24*60*60*1000) {
            localStorage.removeItem(SAVE_KEY);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

function clearSave() {
    localStorage.removeItem(SAVE_KEY);
}

// ------------------- Обработчики -------------------
applyBalanceBtn.addEventListener('click', () => {
    const newBal = prompt('Введите новый начальный баланс:', gameState.currentBalance);
    if (newBal && !isNaN(newBal)) {
        gameState.currentBalance = parseFloat(newBal);
        balanceSpan.textContent = gameState.currentBalance;
        socket.emit('addBalance', 'Изменение баланса', 0);
    }
});

resetBtn.addEventListener('click', () => {
    if (confirm('Начать новый турнир?')) {
        resetGame();
        clearSave();
    }
});

completeBtn.addEventListener('click', () => completeTask(true));
failBtn.addEventListener('click', () => completeTask(false));

completionResetBtn.addEventListener('click', () => {
    completionModal.classList.add('hidden');
    resetGame();
});

// Правила
if (!localStorage.getItem('quest_rules_hidden')) {
    setTimeout(() => rulesModal.classList.remove('hidden'), 500);
}
startQuestBtn.addEventListener('click', () => {
    if (dontShowCheckbox.checked) localStorage.setItem('quest_rules_hidden', 'true');
    rulesModal.classList.add('hidden');
});
rulesBtn.addEventListener('click', () => rulesModal.classList.remove('hidden'));
rulesModal.querySelector('.close-modal')?.addEventListener('click', () => rulesModal.classList.add('hidden'));

// Закрытие модалок по клику вне
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});