const socket = io();

// DOM элементы
const playerHealthBar = document.getElementById('player-health-bar');
const playerHealthText = document.getElementById('player-health-text');
const playerFuryBar = document.getElementById('player-fury-bar');
const playerFuryText = document.getElementById('player-fury-text');
const enemyHealthBar = document.getElementById('enemy-health-bar');
const enemyHealthText = document.getElementById('enemy-health-text');
const turnIndicator = document.getElementById('turn-indicator');
const actionsContainer = document.getElementById('actions-container');
const historyDiv = document.getElementById('history-list');
const taskModal = document.getElementById('task-modal');
const taskDescription = document.getElementById('task-description');
const taskSuccessBtn = document.getElementById('task-success');
const taskFailBtn = document.getElementById('task-fail');
const endModal = document.getElementById('end-modal');
const endTitle = document.getElementById('end-title');
const endMessage = document.getElementById('end-message');
const endResetBtn = document.getElementById('end-reset-btn');
const resetBattleBtn = document.getElementById('reset-battle-btn');
const forceWinBtn = document.getElementById('force-win-btn');
const toast = document.getElementById('toast');

let currentTask = null;
let currentAction = null;

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function updateUI(state) {
    // Обновляем здоровье и ярость
    const playerHealthPercent = (state.player.health / 100) * 100;
    playerHealthBar.style.width = `${playerHealthPercent}%`;
    playerHealthText.textContent = `❤️ ${state.player.health}`;
    const playerFuryPercent = (state.player.fury / 100) * 100;
    playerFuryBar.style.width = `${playerFuryPercent}%`;
    playerFuryText.textContent = `⚡ ${state.player.fury}/100`;

    const enemyHealthPercent = (state.enemy.health / 100) * 100;
    enemyHealthBar.style.width = `${enemyHealthPercent}%`;
    enemyHealthText.textContent = `❤️ ${state.enemy.health}`;

    if (state.currentTurn === 'player') {
        turnIndicator.innerHTML = '⚔️ Ваш ход ⚔️';
        turnIndicator.style.color = '#ffaa44';
    } else {
        turnIndicator.innerHTML = '👻 Ход противника 👻';
        turnIndicator.style.color = '#aa6f3c';
    }

    // Отрисовка истории
    historyDiv.innerHTML = '';
    state.history.slice().reverse().forEach(entry => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.textContent = entry.text;
        historyDiv.appendChild(div);
    });
    historyDiv.scrollTop = historyDiv.scrollHeight;

    // Отрисовка карточек действий, если ход игрока и бой активен
    if (state.battleActive && state.currentTurn === 'player' && state.currentActions) {
        renderActions(state.currentActions);
    } else if (state.currentTurn !== 'player') {
        actionsContainer.innerHTML = '<div class="action-card" style="background: #444; cursor: default;">Ожидание хода противника...</div>';
    }
}

function renderActions(actions) {
    actionsContainer.innerHTML = '';
    actions.forEach(action => {
        const card = document.createElement('div');
        card.className = 'action-card';
        card.dataset.action = action.id;
        let icon = '';
        if (action.id === 'attack') icon = '⚔️';
        else if (action.id === 'defend') icon = '🛡️';
        else if (action.id === 'dodge') icon = '💨';
        else if (action.id === 'fury') icon = '⚡';
        else if (action.id === 'super') icon = '💥';
        card.innerHTML = `
            <div class="action-icon">${icon}</div>
            <div class="action-name">${action.name}</div>
            <div class="action-desc">${action.description}</div>
        `;
        card.addEventListener('click', () => {
            if (!state.battleActive || state.currentTurn !== 'player') {
                showToast('Сейчас нельзя выбрать действие');
                return;
            }
            socket.emit('chooseAction', action.id);
        });
        actionsContainer.appendChild(card);
    });
}

socket.on('battleState', (state) => {
    updateUI(state);
    // Если бой закончен, показываем модалку
    if (!state.battleActive && state.winner) {
        if (state.winner === 'player') {
            endTitle.innerHTML = '🏆 ПОБЕДА! 🏆';
            endMessage.innerHTML = 'Вы одолели Теневого капитана! Слава гладиатору!';
        } else {
            endTitle.innerHTML = '💀 ПОРАЖЕНИЕ 💀';
            endMessage.innerHTML = 'Теневой капитан оказался сильнее... Попробуйте снова!';
        }
        endModal.classList.remove('hidden');
    }
});

socket.on('taskForAction', ({ actionId, task }) => {
    currentAction = actionId;
    currentTask = task;
    taskDescription.textContent = task.text;
    taskModal.classList.remove('hidden');
});

socket.on('battleEnd', ({ winner }) => {
    // Модалка уже откроется при получении battleState
});

socket.on('error', (msg) => {
    showToast(msg);
});

// Обработчики модалки задания
taskSuccessBtn.addEventListener('click', () => {
    if (currentTask) {
        socket.emit('taskResult', { success: true });
        taskModal.classList.add('hidden');
        currentTask = null;
        currentAction = null;
    }
});

taskFailBtn.addEventListener('click', () => {
    if (currentTask) {
        socket.emit('taskResult', { success: false });
        taskModal.classList.add('hidden');
        currentTask = null;
        currentAction = null;
    }
});

resetBattleBtn.addEventListener('click', () => {
    if (confirm('Начать новый бой?')) {
        socket.emit('resetBattle');
        endModal.classList.add('hidden');
    }
});

forceWinBtn.addEventListener('click', () => {
    if (confirm('Принудительно засчитать победу?')) {
        socket.emit('forceWin');
    }
});

endResetBtn.addEventListener('click', () => {
    socket.emit('resetBattle');
    endModal.classList.add('hidden');
});

// Зрительские голосования (простой пример: клик по карточке действия)
// Можно добавить кнопки голосования, но для простоты сделаем голосование через команды в чате.
// Здесь мы не реализуем полную систему чата, но для демонстрации добавим обработку голосов через консоль.
// Для интеграции с реальным чатом нужно будет добавить отдельный модуль.

// Пример: слушаем голоса от зрителей (можно через отдельные сокеты или через команды)
// Для простоты добавим возможность голосовать, кликнув по действию с зажатым Ctrl
document.addEventListener('click', (e) => {
    const actionCard = e.target.closest('.action-card');
    if (actionCard && e.ctrlKey) {
        const actionId = actionCard.dataset.action;
        if (actionId) {
            socket.emit('vote', actionId);
            showToast(`Голос за ${actionId} принят!`);
        }
    }
});