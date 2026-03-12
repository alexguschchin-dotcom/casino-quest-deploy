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
    gameCompleted: false
};

// DOM элементы
const balanceSpan = document.getElementById('current-balance');
const playerScoreSpan = document.getElementById('player-score');
const opponentScoreSpan = document.getElementById('opponent-score');
const roundSpan = document.getElementById('round-count');
const historyDiv = document.getElementById('history-list');
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
}

// Ход противника (открыть одну карту, начислить очки, убрать, добить новую)
function opponentTurn() {
    if (gameState.opponentHand.length === 0) return;
    // Выбираем случайную карту из руки противника
    const index = Math.floor(Math.random() * gameState.opponentHand.length);
    const card = gameState.opponentHand[index];
    gameState.opponentHand.splice(index, 1);
    
    // Начисляем очки (звёздность)
    const points = card.difficulty;
    gameState.opponentScore += points;
    opponentScoreSpan.textContent = gameState.opponentScore;
    
    // Добавляем запись в историю
    addHistoryEntry(`🤖 Противник открыл задание ${points}★`);
    
    // Добираем новую карту, если есть
    const newCard = drawCardFromPool();
    if (newCard) gameState.opponentHand.push(newCard);
    
    renderHands();
}

// Добавить запись в историю
function addHistoryEntry(text) {
    const entry = document.createElement('div');
    entry.className = 'history-item';
    entry.textContent = text;
    historyDiv.appendChild(entry);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

// Отрисовка рук
function renderHands() {
    // Рука игрока
    playerHandDiv.innerHTML = '';
    gameState.playerHand.forEach((card, idx) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = idx;
        cardEl.innerHTML = `
            <div class="card-back">🃏</div>
            <div class="card-front" style="display: none;">
                <div class="stars">${'★'.repeat(card.difficulty)}</div>
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

// Завершение задания (успех/провал)
function completeTask(success) {
    const newBalance = parseFloat(newBalanceInput.value);
    if (isNaN(newBalance)) return;
    
    const change = newBalance - gameState.currentBalance;
    const cardIndex = window.selectedCardIndex;
    const card = gameState.playerHand[cardIndex];
    
    // Удаляем карту из руки игрока
    gameState.playerHand.splice(cardIndex, 1);
    
    // Добавляем очки игроку (звёздность)
    if (success) {
        gameState.playerScore += card.difficulty;
        playerScoreSpan.textContent = gameState.playerScore;
        addHistoryEntry(`✅ Вы выполнили задание ${card.difficulty}★`);
    } else {
        addHistoryEntry(`❌ Вы провалили задание ${card.difficulty}★`);
    }
    
    // Отправляем событие на сервер
    if (success) {
        socket.emit('completeTask', card.id, change);
    } else {
        socket.emit('penaltyWithBalance', card.id, newBalance);
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
    taskModal.classList.add('hidden');
}

// Завершение игры
function endGame() {
    gameState.gameCompleted = true;
    let message = '';
    if (gameState.playerScore > gameState.opponentScore) {
        message = '🏆 Вы победили!';
    } else if (gameState.playerScore < gameState.opponentScore) {
        message = '😔 Противник оказался сильнее...';
    } else {
        message = '🤝 Ничья!';
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
    gameState.currentBalance = parseFloat(document.getElementById('start-balance')?.value) || 1500000;
    gameState.balanceHistory = [];
    gameState.gameCompleted = false;
    
    // Запрашиваем новый пул у сервера (отправляем reset)
    socket.emit('reset', gameState.currentBalance);
    
    // Очистим историю
    historyDiv.innerHTML = '';
    roundSpan.textContent = '1';
    playerScoreSpan.textContent = '0';
    opponentScoreSpan.textContent = '0';
    balanceSpan.textContent = gameState.currentBalance;
}

// ------------------- Подключение к серверу -------------------
socket.on('connect', () => {
    const saved = loadGameState();
    if (saved && !saved.gameCompleted) {
        if (confirm('Найден сохранённый турнир. Восстановить?')) {
            gameState = saved;
            updateUI();
            renderHands();
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

// Анимация сгорания (оставим, но не используется)
// (можно убрать)