const socket = io();

// Состояние игры
let gameState = {
    currentRoomIndex: 0,          // индекс текущей комнаты (куда зашли герои)
    rooms: [],                    // массив комнат
    heroesX: 0,                   // координаты героев на карте
    heroesY: 0,
    currentBalance: 1500000,
    balanceHistory: [],
    availableTasks: [],           // пул заданий от сервера
    currentTaskId: null,
    savedGame: null
};

// DOM элементы
const canvas = document.getElementById('dungeonMap');
const ctx = canvas.getContext('2d');
const balanceSpan = document.getElementById('current-balance');
const historyDiv = document.getElementById('balance-history');
const resetBtn = document.getElementById('reset-btn');
const taskModal = document.getElementById('task-modal');
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

// Ключ сохранения
const SAVE_KEY = 'temple_quest_save';

// ------------------- Инициализация карты -------------------
function initMap() {
    // Создаём 30 комнат, расположенных в виде дерева (упрощённо)
    // Каждая комната имеет координаты (x, y), тип, соседей, задание (позже), состояние
    const rooms = [];
    // Простая линейная карта с развилками
    const roomData = [
        { x: 100, y: 300, type: 'start', name: 'Вход' },
        { x: 250, y: 200, type: 'normal', name: 'Зал теней' },
        { x: 250, y: 400, type: 'normal', name: 'Зал огня' },
        { x: 400, y: 150, type: 'normal', name: 'Комната воинов' },
        { x: 400, y: 300, type: 'trap', name: 'Ловушка' },
        { x: 400, y: 450, type: 'treasure', name: 'Сокровищница' },
        { x: 550, y: 100, type: 'normal', name: 'Библиотека' },
        { x: 550, y: 250, type: 'boss', name: 'Тронный зал' },
        // ... до 30 комнат, но для примера сократим
    ];
    for (let i = 0; i < 30; i++) {
        // Заполним остальные комнаты случайными координатами для демонстрации
        rooms.push({
            index: i,
            x: 100 + (i % 6) * 150,
            y: 100 + Math.floor(i / 6) * 150,
            type: i === 0 ? 'start' : (i === 29 ? 'boss' : 'normal'),
            name: `Комната ${i+1}`,
            visited: i === 0,
            available: i === 0 || i === 1 || i === 2, // для демо первые три доступны
            taskId: null,
            neighbors: []
        });
    }
    // Простая связь: каждая комната соединена со следующей
    for (let i = 0; i < rooms.length - 1; i++) {
        rooms[i].neighbors.push(i+1);
    }
    // Добавим развилки
    rooms[1].neighbors.push(3);
    rooms[2].neighbors.push(5);
    return rooms;
}

gameState.rooms = initMap();
gameState.heroesX = gameState.rooms[0].x;
gameState.heroesY = gameState.rooms[0].y;

// ------------------- Отрисовка карты -------------------
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем тропинки
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'gold';
    ctx.shadowBlur = 10;
    
    gameState.rooms.forEach(room => {
        room.neighbors.forEach(neighbor => {
            const next = gameState.rooms[neighbor];
            ctx.beginPath();
            ctx.moveTo(room.x, room.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
        });
    });
    
    ctx.shadowBlur = 0;
    
    // Рисуем комнаты
    gameState.rooms.forEach((room, index) => {
        let color = '#2a2440';
        if (room.visited) color = '#4ecca7';
        if (index === gameState.currentRoomIndex) color = '#ffaa00';
        
        ctx.fillStyle = color;
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(room.x, room.y, 20, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Иконка типа комнаты
        ctx.font = '24px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let emoji = '';
        switch(room.type) {
            case 'start': emoji = '🚪'; break;
            case 'normal': emoji = '👾'; break;
            case 'trap': emoji = '💀'; break;
            case 'treasure': emoji = '💰'; break;
            case 'boss': emoji = '👑'; break;
            default: emoji = '⬜';
        }
        ctx.fillText(emoji, room.x, room.y);
    });
    
    // Рисуем героев
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'gold';
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText('⚔️🏹🔮', gameState.heroesX - 30, gameState.heroesY - 30);
    ctx.shadowBlur = 0;
}

// ------------------- Загрузка задания для комнаты -------------------
function enterRoom(roomIndex) {
    const room = gameState.rooms[roomIndex];
    if (!room || room.visited) return;
    
    // Получаем случайное задание из пула (или можно связать с комнатой)
    // Для демо используем заглушку
    const task = gameState.availableTasks[Math.floor(Math.random() * gameState.availableTasks.length)];
    if (!task) {
        alert('Нет заданий в пуле');
        return;
    }
    
    gameState.currentTaskId = task.id;
    taskDesc.textContent = task.description;
    newBalanceInput.value = gameState.currentBalance;
    taskModal.classList.remove('hidden');
}

// ------------------- Обработка завершения задания -------------------
function completeTask(success) {
    const newBalance = parseFloat(newBalanceInput.value);
    if (isNaN(newBalance)) return;
    
    const change = newBalance - gameState.currentBalance;
    const task = gameState.availableTasks.find(t => t.id === gameState.currentTaskId);
    if (!task) return;
    
    // Отправляем событие на сервер (как раньше)
    if (success) {
        socket.emit('completeTask', gameState.currentTaskId, change);
    } else {
        socket.emit('penaltyWithBalance', gameState.currentTaskId, newBalance);
    }
    
    // Обновляем локально (сервер пришлёт новое состояние)
    // Но пока отметим комнату пройденной
    const room = gameState.rooms[gameState.currentRoomIndex];
    if (room) {
        room.visited = true;
        // Открываем соседей
        room.neighbors.forEach(idx => {
            gameState.rooms[idx].available = true;
        });
    }
    
    taskModal.classList.add('hidden');
}

// ------------------- Подключение к серверу -------------------
socket.on('connect', () => {
    const saved = loadGameState();
    if (saved) {
        if (confirm('Найден сохранённый поход. Восстановить?')) {
            gameState = saved;
            gameState.heroesX = gameState.rooms[gameState.currentRoomIndex].x;
            gameState.heroesY = gameState.rooms[gameState.currentRoomIndex].y;
            updateUI();
            return;
        } else {
            clearSavedGame();
        }
    }
    socket.emit('reset', 1500000);
});

socket.on('state', (serverState) => {
    // Обновляем баланс и историю, но карту оставляем свою
    gameState.currentBalance = serverState.currentBalance;
    gameState.balanceHistory = serverState.balanceHistory;
    gameState.availableTasks = serverState.availableTasks;
    updateUI();
    saveGameState();
});

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

// ------------------- Сохранение и загрузка -------------------
function saveGameState() {
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

function clearSavedGame() {
    localStorage.removeItem(SAVE_KEY);
}

// ------------------- Обработчики событий -------------------
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // Ищем комнату под курсором
    for (let i = 0; i < gameState.rooms.length; i++) {
        const room = gameState.rooms[i];
        const dist = Math.hypot(mouseX - room.x, mouseY - room.y);
        if (dist < 25 && room.available && !room.visited && i !== gameState.currentRoomIndex) {
            // Перемещаем героев в эту комнату
            gameState.currentRoomIndex = i;
            gameState.heroesX = room.x;
            gameState.heroesY = room.y;
            drawMap();
            enterRoom(i);
            break;
        }
    }
});

completeBtn.addEventListener('click', () => completeTask(true));
failBtn.addEventListener('click', () => completeTask(false));

resetBtn.addEventListener('click', () => {
    if (confirm('Начать новое приключение?')) {
        socket.emit('reset', parseFloat(document.getElementById('start-balance').value) || 1500000);
        gameState.rooms = initMap();
        gameState.currentRoomIndex = 0;
        gameState.heroesX = gameState.rooms[0].x;
        gameState.heroesY = gameState.rooms[0].y;
        clearSavedGame();
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

// Применить начальный баланс (упрощённо)
document.querySelector('.balance-btn').addEventListener('click', () => {
    const newBal = prompt('Введите начальный баланс:', gameState.currentBalance);
    if (newBal && !isNaN(newBal)) {
        gameState.currentBalance = parseFloat(newBal);
        updateUI();
        socket.emit('addBalance', 'Изменение стартового баланса', 0); // просто фиксация
    }
});