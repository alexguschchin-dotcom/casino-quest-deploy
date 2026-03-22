const socket = io();

const TOTAL_TILES = 25;
let gameState = null;
let tasks = null;

const puzzleGrid = document.getElementById('puzzle-grid');
const taskIndexSpan = document.getElementById('task-index');
const taskTextSpan = document.getElementById('task-text');
const taskTypeSpan = document.getElementById('task-type');
const newScoreInput = document.getElementById('new-score');
const successBtn = document.getElementById('success-btn');
const failBtn = document.getElementById('fail-btn');
const hintBtn = document.getElementById('hint-btn');
const toast = document.getElementById('toast');
const finalModal = document.getElementById('final-modal');
const resetBtn = document.getElementById('reset-btn');
const finalImageDiv = document.getElementById('final-image');

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function renderPuzzle() {
    if (!gameState) return;
    puzzleGrid.innerHTML = '';
    for (let i = 0; i < TOTAL_TILES; i++) {
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        if (gameState.completedTiles[i]) {
            tile.classList.add('completed');
            // Если клетка открыта, показываем фрагмент картинки (в CSS через background-position)
            // Для простоты пока просто ставим иконку
            tile.innerHTML = '📸';
        } else {
            tile.innerHTML = '❓';
        }
        puzzleGrid.appendChild(tile);
    }
}

function updateTaskPanel() {
    if (!gameState || !tasks) return;
    const currentTask = tasks[gameState.currentTaskIndex];
    taskIndexSpan.textContent = gameState.currentTaskIndex + 1;
    taskTextSpan.textContent = currentTask.text;
    taskTypeSpan.textContent = currentTask.type === 'casino' ? '🎰 Казино' : '💬 Чат';
}

function showFinalModal() {
    finalModal.classList.remove('hidden');
    finalImageDiv.innerHTML = '<img src="https://via.placeholder.com/400x300?text=Ваше+фото" alt="Финальное фото">'; // здесь можно подставить реальное изображение
}

socket.on('init', (data) => {
    gameState = data.state;
    tasks = data.tasks;
    renderPuzzle();
    updateTaskPanel();
});

socket.on('update', (data) => {
    gameState = data.state;
    tasks = data.tasks;
    renderPuzzle();
    updateTaskPanel();

    if (gameState.gameFinished) {
        showFinalModal();
    }
});

socket.on('failNotification', (data) => {
    showToast(data.message);
});

socket.on('hint', (data) => {
    showToast(data.message);
});

successBtn.addEventListener('click', () => {
    const newScore = parseFloat(newScoreInput.value);
    if (isNaN(newScore)) {
        showToast('Введите новое значение баланса');
        return;
    }
    // Здесь можно было бы отправить на сервер newScore, но для простоты считаем, что успех всегда открывает клетку
    socket.emit('completeTask', true);
    newScoreInput.value = '';
});

failBtn.addEventListener('click', () => {
    socket.emit('completeTask', false);
});

hintBtn.addEventListener('click', () => {
    socket.emit('askHint');
});

resetBtn.addEventListener('click', () => {
    location.reload(); // простой способ сброса
});

// Закрытие модалки
window.addEventListener('click', (e) => {
    if (e.target === finalModal) {
        finalModal.classList.add('hidden');
    }
});