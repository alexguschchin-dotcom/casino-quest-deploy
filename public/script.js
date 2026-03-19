const socket = io();

// Призовые суммы для каждого уровня
const PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
const SAFE_LEVELS = [5, 10, 15];

let gameState = {
    level: 1,
    gold: 0,
    hints: { fifty: true, phone: true, audience: true },
    completed: false
};

let phoneTimer = null;
let audienceTimer = null;

// DOM элементы
const levelSpan = document.getElementById('current-level');
const goldSpan = document.getElementById('current-gold');
const taskLevelSpan = document.getElementById('task-level');
const taskTextDiv = document.getElementById('task-text');
const prizeListDiv = document.getElementById('prize-list');
const hintFifty = document.getElementById('hint-fifty');
const hintPhone = document.getElementById('hint-phone');
const hintAudience = document.getElementById('hint-audience');
const submitSuccess = document.getElementById('submit-success');
const submitFail = document.getElementById('submit-fail');
const takeMoneyBtn = document.getElementById('take-money');
const resetBtn = document.getElementById('reset-btn');
const newGameBtn = document.getElementById('new-game-btn');
const gameoverModal = document.getElementById('gameover-modal');
const finalMessage = document.getElementById('final-message');
const finalGoldSpan = document.getElementById('final-gold');
const phoneModal = document.getElementById('phone-modal');
const audienceModal = document.getElementById('audience-modal');
const phoneTimerSpan = document.getElementById('phone-timer');
const audienceTimerSpan = document.getElementById('audience-timer');
const closePhoneModal = document.getElementById('close-phone-modal');
const closeAudienceModal = document.getElementById('close-audience-modal');
const toast = document.getElementById('toast');

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function renderPrizeList() {
    let html = '';
    for (let i = 0; i < PRIZES.length; i++) {
        const level = i + 1;
        const prize = PRIZES[i];
        const isCurrent = (level === gameState.level);
        const isSafe = SAFE_LEVELS.includes(level);
        html += `<div class="prize-item ${isCurrent ? 'current' : ''} ${isSafe ? 'safe' : ''}">${level}. ${prize} 🔥</div>`;
    }
    prizeListDiv.innerHTML = html;
}

function updateUI() {
    levelSpan.textContent = gameState.level;
    goldSpan.textContent = gameState.gold;
    taskLevelSpan.textContent = gameState.level;
    renderPrizeList();

    // Обновляем доступность подсказок
    hintFifty.disabled = !gameState.hints.fifty || gameState.completed;
    hintPhone.disabled = !gameState.hints.phone || gameState.completed;
    hintAudience.disabled = !gameState.hints.audience || gameState.completed;

    // Показываем кнопку "Забрать золото" на несгораемых уровнях
    if (SAFE_LEVELS.includes(gameState.level) && !gameState.completed) {
        takeMoneyBtn.classList.remove('hidden');
    } else {
        takeMoneyBtn.classList.add('hidden');
    }
}

socket.on('init', (data) => {
    gameState = data.gameState;
    taskTextDiv.textContent = data.currentTask.text;
    updateUI();
});

socket.on('update', (data) => {
    gameState = data.gameState;
    taskTextDiv.textContent = data.currentTask.text;
    updateUI();
});

socket.on('gameOver', (data) => {
    gameState.completed = true;
    updateUI();
    if (data.win) {
        finalMessage.textContent = data.tookMoney
            ? `Вы забрали золото и закончили игру!`
            : `Поздравляем! Вы прошли игру и заработали ${data.gold} 🔥!`;
    } else {
        finalMessage.textContent = `Вы проиграли. Ваше золото: ${data.gold} 🔥.`;
    }
    finalGoldSpan.textContent = data.gold;
    gameoverModal.classList.remove('hidden');
});

socket.on('phoneHintActivated', () => {
    phoneModal.classList.remove('hidden');
    let timeLeft = 30;
    phoneTimerSpan.textContent = timeLeft;
    if (phoneTimer) clearInterval(phoneTimer);
    phoneTimer = setInterval(() => {
        timeLeft--;
        phoneTimerSpan.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(phoneTimer);
            phoneModal.classList.add('hidden');
        }
    }, 1000);
});

socket.on('audienceHintActivated', () => {
    audienceModal.classList.remove('hidden');
    let timeLeft = 30;
    audienceTimerSpan.textContent = timeLeft;
    if (audienceTimer) clearInterval(audienceTimer);
    audienceTimer = setInterval(() => {
        timeLeft--;
        audienceTimerSpan.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(audienceTimer);
            audienceModal.classList.add('hidden');
        }
    }, 1000);
});

// Обработчики подсказок
hintFifty.addEventListener('click', () => {
    socket.emit('useHint', 'fifty');
});
hintPhone.addEventListener('click', () => {
    socket.emit('useHint', 'phone');
});
hintAudience.addEventListener('click', () => {
    socket.emit('useHint', 'audience');
});

// Отправка результата задания
submitSuccess.addEventListener('click', () => {
    const newGold = parseFloat(document.getElementById('new-gold').value);
    if (!isNaN(newGold)) {
        socket.emit('submitResult', newGold);
    } else {
        showToast('Введите корректное значение золота');
    }
});

submitFail.addEventListener('click', () => {
    // При провале просто отправляем текущее золото (проигрыш)
    socket.emit('submitResult', gameState.gold - 1000); // для примера уменьшаем, но в реальности стример вводит сам
});

// Забрать золото на несгораемом уровне
takeMoneyBtn.addEventListener('click', () => {
    socket.emit('takeMoney');
});

// Новая игра
resetBtn.addEventListener('click', () => {
    socket.emit('reset');
    gameoverModal.classList.add('hidden');
});
newGameBtn.addEventListener('click', () => {
    socket.emit('reset');
    gameoverModal.classList.add('hidden');
});

// Закрытие модалок
closePhoneModal.addEventListener('click', () => {
    phoneModal.classList.add('hidden');
    clearInterval(phoneTimer);
});
closeAudienceModal.addEventListener('click', () => {
    audienceModal.classList.add('hidden');
    clearInterval(audienceTimer);
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
        clearInterval(phoneTimer);
        clearInterval(audienceTimer);
    }
});

// Анимация золотых искр (опционально)
(function initSparks() {
    const canvas = document.createElement('canvas');
    canvas.id = 'sparks-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width, height;
    const sparks = [];
    const SPARK_COUNT = 30;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < SPARK_COUNT; i++) {
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.2,
            opacity: Math.random() * 0.7 + 0.3,
            color: `rgba(255, 215, 0, ${Math.random()*0.5+0.3})`
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        sparks.forEach(s => {
            s.y -= s.speed;
            if (s.y + s.radius < 0) {
                s.y = height + s.radius;
                s.x = Math.random() * width;
            }
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        requestAnimationFrame(animate);
    }
    animate();
})();