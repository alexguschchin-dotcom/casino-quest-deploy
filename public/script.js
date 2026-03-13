const socket = io();

// Состояние игры
let gameState = {
    playerHand: [],
    opponentHand: [],
    playerScore: 0,
    opponentScore: 0,
    round: 1,
    currentBalance: 1500000,
    balanceHistory: [],
    availableTasks: [],
    currentTaskId: null,
    gameCompleted: false
};

// DOM элементы
const balanceSpan = document.getElementById('current-balance');
const playerScoreSpan = document.getElementById('player-score');
const opponentScoreSpan = document.getElementById('opponent-score');
const roundSpan = document.getElementById('round-count');
const historyDiv = document.getElementById('history-list');
const poolStatsVertical = document.getElementById('pool-stats-vertical');
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

// ------------------- Преобразование difficulty в масть и очки -------------------
function difficultyToSuit(diff) {
    if (diff <= 1) return '♥';
    if (diff === 2) return '♦';
    if (diff === 3) return '♣';
    return '♠';
}

function difficultyToPoints(diff) {
    if (diff <= 1) return 1;
    if (diff === 2) return 2;
    if (diff === 3) return 3;
    return 4;
}

// ------------------- Вспомогательные функции -------------------
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function drawCardFromPool() {
    if (gameState.availableTasks.length === 0) return null;
    const index = Math.floor(Math.random() * gameState.availableTasks.length);
    const card = gameState.availableTasks[index];
    gameState.availableTasks.splice(index, 1);
    return card;
}

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
    updatePoolStatsVertical();
}

function opponentTurn() {
    if (gameState.opponentHand.length === 0) return;
    const index = Math.floor(Math.random() * gameState.opponentHand.length);
    const card = gameState.opponentHand[index];
    gameState.opponentHand.splice(index, 1);
    
    const points = difficultyToPoints(card.difficulty);
    gameState.opponentScore += points;
    opponentScoreSpan.textContent = gameState.opponentScore;
    
    const suit = difficultyToSuit(card.difficulty);
    addHistoryEntry(`🤖 Противник открыл ${suit} (${points} очк.)`);
    
    const newCard = drawCardFromPool();
    if (newCard) gameState.opponentHand.push(newCard);
    
    renderHands();
    updatePoolStatsVertical();
}

function addHistoryEntry(text) {
    const entry = document.createElement('div');
    entry.className = 'history-item';
    entry.textContent = text;
    historyDiv.appendChild(entry);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function updatePoolStatsVertical() {
    const counts = { '♥': 0, '♦': 0, '♣': 0, '♠': 0 };
    gameState.availableTasks.forEach(task => {
        const suit = difficultyToSuit(task.difficulty);
        counts[suit]++;
    });
    poolStatsVertical.innerHTML = `
        <div class="pool-stat-item">
            <span class="suit ♥">♥</span> <span>${counts['♥']}</span>
        </div>
        <div class="pool-stat-item">
            <span class="suit ♦">♦</span> <span>${counts['♦']}</span>
        </div>
        <div class="pool-stat-item">
            <span class="suit ♣">♣</span> <span>${counts['♣']}</span>
        </div>
        <div class="pool-stat-item">
            <span class="suit ♠">♠</span> <span>${counts['♠']}</span>
        </div>
    `;
}

function renderHands() {
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

    opponentHandDiv.innerHTML = '';
    gameState.opponentHand.forEach(() => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<div class="card-back">🃏</div>`;
        opponentHandDiv.appendChild(cardEl);
    });
}

function selectPlayerCard(index) {
    if (gameState.playerHand.length <= index) return;
    const card = gameState.playerHand[index];
    gameState.currentTaskId = card.id;
    taskDesc.textContent = card.description;
    newBalanceInput.value = gameState.currentBalance;
    taskModal.classList.remove('hidden');
    window.selectedCardIndex = index;
}

function completeTask(success) {
    const newBalance = parseFloat(newBalanceInput.value);
    if (isNaN(newBalance)) return;
    
    const change = newBalance - gameState.currentBalance;
    const cardIndex = window.selectedCardIndex;
    const card = gameState.playerHand[cardIndex];
    
    gameState.playerHand.splice(cardIndex, 1);
    
    const points = difficultyToPoints(card.difficulty);
    if (success) {
        gameState.playerScore += points;
        playerScoreSpan.textContent = gameState.playerScore;
        addHistoryEntry(`✅ Вы выполнили задание (${points} очк.)`);
    } else {
        addHistoryEntry(`❌ Вы провалили задание (0 очк.)`);
    }
    
    if (success) {
        socket.emit('completeTask', card.id, change);
    } else {
        socket.emit('penaltyWithBalance', card.id, newBalance);
    }
    
    const newCard = drawCardFromPool();
    if (newCard) gameState.playerHand.push(newCard);
    
    opponentTurn();
    
    gameState.round++;
    roundSpan.textContent = gameState.round;
    
    if (gameState.round > 30 || gameState.availableTasks.length === 0) {
        endGame();
    }
    
    renderHands();
    updatePoolStatsVertical();
    taskModal.classList.add('hidden');
}

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

function resetGame() {
    gameState.playerHand = [];
    gameState.opponentHand = [];
    gameState.playerScore = 0;
    gameState.opponentScore = 0;
    gameState.round = 1;
    gameState.currentBalance = 1500000;
    gameState.balanceHistory = [];
    gameState.gameCompleted = false;
    
    socket.emit('reset', gameState.currentBalance);
    
    historyDiv.innerHTML = '';
    roundSpan.textContent = '1';
    playerScoreSpan.textContent = '0';
    opponentScoreSpan.textContent = '0';
    balanceSpan.textContent = gameState.currentBalance;
}

// ------------------- Подключение к серверу -------------------
socket.on('connect', () => {
    socket.emit('reset', 1500000);
});

socket.on('state', (serverState) => {
    gameState.currentBalance = serverState.currentBalance;
    gameState.balanceHistory = serverState.balanceHistory;
    gameState.availableTasks = serverState.availableTasks;
    balanceSpan.textContent = gameState.currentBalance;
    
    if (gameState.playerHand.length === 0 && gameState.availableTasks.length > 0) {
        initHands();
    }
    renderHistory();
    updatePoolStatsVertical();
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

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});