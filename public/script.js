const socket = io();

// ------------------- Конфигурация игры -------------------
const ROWS = 5;
const COLS = 6;
const ROOM_SIZE = 100; // размер клетки на canvas

// Состояние игры
let gameState = {
    map: [],                  // 2D массив комнат
    playerRow: 0,
    playerCol: 0,
    currentBalance: 1500000,
    balanceHistory: [],
    availableTasks: [],
    currentTaskId: null,
    gameCompleted: false
};

// DOM элементы
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const balanceSpan = document.getElementById('current-balance');
const historyDiv = document.getElementById('history-list');
const resetBtn = document.getElementById('reset-btn');
const taskModal = document.getElementById('task-modal');
const roomTitle = document.getElementById('room-title');
const taskDesc = document.getElementById('task-description');
const newBalanceInput = document.getElementById('new-balance');
const completeBtn = document.getElementById('complete-task');
const failBtn = document.getElementById('fail-task');
const completionModal = document.getElementById('completion-modal');
const finalBalanceSpan = document.getElementById('final-balance');
const completionResetBtn = document.getElementById('completion-reset-btn');
const rulesModal = document.getElementById('rules-modal');
const dontShowCheckbox = document.getElementById('dont-show-rules');
const startQuestBtn = document.getElementById('start-quest-btn');
const moveUp = document.getElementById('move-up');
const moveDown = document.getElementById('move-down');
const moveLeft = document.getElementById('move-left');
const moveRight = document.getElementById('move-right');

// Кнопка изменения баланса
document.getElementById('apply-start-balance').addEventListener('click', () => {
    const newBal = prompt('Введите новый стартовый баланс:', gameState.currentBalance);
    if (newBal && !isNaN(newBal)) {
        gameState.currentBalance = parseFloat(newBal);
        updateUI();
        socket.emit('addBalance', 'Изменение стартового баланса', 0);
    }
});

// ------------------- Генерация карты -------------------
function generateMap() {
    const map = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            // Типы комнат: 'normal', 'treasure', 'monster', 'trap', 'boss'
            let type = 'normal';
            if (r === ROWS-1 && c === COLS-1) type = 'boss';
            else if (Math.random() < 0.15) type = 'treasure';
            else if (Math.random() < 0.2) type = 'monster';
            else if (Math.random() < 0.1) type = 'trap';
            
            row.push({
                type: type,
                visited: false,
                available: (r === 0 && c === 0), // только старт доступен
                taskId: null
            });
        }
        map.push(row);
    }
    map[0][0].visited = true; // старт посещён
    return map;
}

gameState.map = generateMap();

// ------------------- Отрисовка карты -------------------
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем сетку
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 3;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * ROOM_SIZE + 50;
            const y = r * ROOM_SIZE + 50;
            
            // Цвет в зависимости от типа и посещённости
            let fillColor = '#2a2440';
            if (gameState.map[r][c].visited) fillColor = '#4ecca7';
            if (gameState.playerRow === r && gameState.playerCol === c) fillColor = '#ffaa00';
            
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = '#b8860b';
            ctx.lineWidth = 3;
            ctx.fillRect(x, y, ROOM_SIZE-10, ROOM_SIZE-10);
            ctx.strokeRect(x, y, ROOM_SIZE-10, ROOM_SIZE-10);
            
            // Иконка комнаты
            ctx.font = '40px "Font Awesome 6 Free", "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let icon = '';
            switch(gameState.map[r][c].type) {
                case 'treasure': icon = '💰'; break;
                case 'monster': icon = '👾'; break;
                case 'trap': icon = '💀'; break;
                case 'boss': icon = '👑'; break;
                default: icon = '⬜';
            }
            ctx.fillText(icon, x + ROOM_SIZE/2 - 5, y + ROOM_SIZE/2 - 5);
        }
    }

    // Рисуем героев (отряд)
    const px = gameState.playerCol * ROOM_SIZE + 50 + ROOM_SIZE/2 - 20;
    const py = gameState.playerRow * ROOM_SIZE + 50 + ROOM_SIZE/2 - 20;
    ctx.font = '50px "Font Awesome 6 Free", "Segoe UI Emoji", sans-serif';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'gold';
    ctx.shadowBlur = 20;
    ctx.fillText('⚔️🏹🔮', px - 30, py - 10);
    ctx.shadowBlur = 0;
}

// ------------------- Движение персонажа -------------------
function tryMove(dr, dc) {
    const newRow = gameState.playerRow + dr;
    const newCol = gameState.playerCol + dc;
    
    // Проверка границ
    if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) return false;
    
    const targetRoom = gameState.map[newRow][newCol];
    // Можно двигаться только если комната доступна и не посещена
    if (!targetRoom.available || targetRoom.visited) return false;
    
    // Перемещаем героя
    gameState.playerRow = newRow;
    gameState.playerCol = newCol;
    targetRoom.visited = true; // отмечаем как посещённую
    
    // Делаем соседние комнаты доступными (кроме посещённых)
    const neighbors = [
        [newRow-1, newCol], [newRow+1, newCol], [newRow, newCol-1], [newRow, newCol+1]
    ];
    neighbors.forEach(([r, c]) => {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !gameState.map[r][c].visited) {
            gameState.map[r][c].available = true;
        }
    });
    
    drawMap();
    
    // Если комната босса и всё пройдено
    if (targetRoom.type === 'boss' && checkAllVisited()) {
        completeGame();
        return true;
    }
    
    // Открываем модалку задания для этой комнаты
    openTaskModal(targetRoom.type);
    
    return true;
}

function checkAllVisited() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!gameState.map[r][c].visited) return false;
        }
    }
    return true;
}

// ------------------- Завершение игры -------------------
function completeGame() {
    gameState.gameCompleted = true;
    finalBalanceSpan.textContent = gameState.currentBalance;
    completionModal.classList.remove('hidden');
}

// ------------------- Модалка задания -------------------
function openTaskModal(roomType) {
    // Получаем случайное задание из пула (или можно по типу)
    const tasks = gameState.availableTasks;
    if (!tasks || tasks.length === 0) {
        alert('Нет заданий!');
        return;
    }
    
    let filtered = tasks;
    if (roomType === 'monster') filtered = tasks.filter(t => t.difficulty >= 4);
    else if (roomType === 'treasure') filtered = tasks.filter(t => t.difficulty >= 3);
    else if (roomType === 'trap') filtered = tasks.filter(t => t.difficulty <= 2);
    
    if (filtered.length === 0) filtered = tasks;
    
    const task = filtered[Math.floor(Math.random() * filtered.length)];
    gameState.currentTaskId = task.id;
    
    let title = '';
    switch(roomType) {
        case 'treasure': title = 'Сундук с сокровищами'; break;
        case 'monster': title = 'Монстр!'; break;
        case 'trap': title = 'Ловушка!'; break;
        case 'boss': title = 'Владыка храма'; break;
        default: title = 'Испытание';
    }
    
    roomTitle.textContent = title;
    taskDesc.textContent = task.description;
    newBalanceInput.value = gameState.currentBalance;
    taskModal.classList.remove('hidden');
}

// ------------------- Обработка завершения задания -------------------
function completeTask(success) {
    const newBalance = parseFloat(newBalanceInput.value);
    if (isNaN(newBalance)) return;
    
    const change = newBalance - gameState.currentBalance;
    
    if (success) {
        socket.emit('completeTask', gameState.currentTaskId, change);
    } else {
        socket.emit('penaltyWithBalance', gameState.currentTaskId, newBalance);
    }
    
    taskModal.classList.add('hidden');
    updateUI();
    saveGame();
}

// ------------------- Сохранение/загрузка -------------------
const SAVE_KEY = 'temple_rpg_save';

function saveGame() {
    try {
        const saveData = {
            ...gameState,
            timestamp: Date.now()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {}
}

function loadGame() {
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

// ------------------- Обновление UI -------------------
function updateUI() {
    balanceSpan.textContent = gameState.currentBalance;
    renderHistory();
    drawMap();
}

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

// ------------------- Подключение к серверу -------------------
socket.on('connect', () => {
    const saved = loadGame();
    if (saved && !saved.gameCompleted) {
        if (confirm('Найден сохранённый поход. Восстановить?')) {
            gameState = saved;
            updateUI();
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
    gameState.availableTasks = serverState.availableTasks;
    updateUI();
    saveGame();
});

// ------------------- Обработчики кнопок движения -------------------
moveUp.addEventListener('click', () => tryMove(-1, 0));
moveDown.addEventListener('click', () => tryMove(1, 0));
moveLeft.addEventListener('click', () => tryMove(0, -1));
moveRight.addEventListener('click', () => tryMove(0, 1));

// Клавиши WASD
window.addEventListener('keydown', (e) => {
    if (taskModal.classList.contains('hidden')) {
        if (e.key === 'w' || e.key === 'W' || e.key === 'ц' || e.key === 'Ц') tryMove(-1, 0);
        if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') tryMove(1, 0);
        if (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') tryMove(0, -1);
        if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') tryMove(0, 1);
    }
});

completeBtn.addEventListener('click', () => completeTask(true));
failBtn.addEventListener('click', () => completeTask(false));

resetBtn.addEventListener('click', () => {
    if (confirm('Начать новое приключение?')) {
        socket.emit('reset', 1500000);
        gameState.map = generateMap();
        gameState.playerRow = 0;
        gameState.playerCol = 0;
        gameState.gameCompleted = false;
        clearSave();
        updateUI();
    }
});

completionResetBtn.addEventListener('click', () => {
    socket.emit('reset', 1500000);
    completionModal.classList.add('hidden');
});

// Правила
if (!localStorage.getItem('quest_rules_hidden')) {
    setTimeout(() => rulesModal.classList.remove('hidden'), 500);
}
startQuestBtn.addEventListener('click', () => {
    if (dontShowCheckbox.checked) localStorage.setItem('quest_rules_hidden', 'true');
    rulesModal.classList.add('hidden');
});
rulesModal.querySelector('.close-modal').addEventListener('click', () => rulesModal.classList.add('hidden'));

// Инициализация
drawMap();