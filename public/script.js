(function(){
    // ---------- ФАЗЫ ----------
    const PHASES = [
        { name: "ВХОД В СИСТЕМУ", icon: "fa-plug", missions: 3, stressInc: 2, trustShift: 2 },
        { name: "ЛОЖНАЯ БЕЗОПАСНОСТЬ", icon: "fa-shield-alt", missions: 4, stressInc: 5, trustShift: 1 },
        { name: "ПЕРВЫЙ СБОЙ", icon: "fa-bug", missions: 4, stressInc: 8, trustShift: -3 },
        { name: "ЛОМКА ЛОГИКИ", icon: "fa-cogs", missions: 5, stressInc: 12, trustShift: -5 },
        { name: "ФАЛЬШИВЫЕ ПРАВИЛА", icon: "fa-mask", missions: 5, stressInc: 15, trustShift: -7 },
        { name: "АНАЛИЗ ПОВЕДЕНИЯ", icon: "fa-chart-line", missions: 4, stressInc: 18, trustShift: -10 },
        { name: "ДАВЛЕНИЕ", icon: "fa-weight-hanging", missions: 5, stressInc: 22, trustShift: -12 },
        { name: "РАЗОБЛАЧЕНИЕ", icon: "fa-eye", missions: 3, stressInc: 25, trustShift: -15 }
    ];

    // Банк заданий (действия в казино + викторины)
    const TASKS = [
        { text: "Сделайте 20 спинов в любом слоте (мин. ставка)", type: "action" },
        { text: "Поставьте на красное и выиграйте", type: "action" },
        { text: "Сыграйте 3 раздачи в блэкджек, проиграв не более одной", type: "action" },
        { text: "Купите бонус за 20$", type: "action" },
        { text: "Сделайте 5 спинов с максимальной ставкой", type: "action" },
        { text: "Сколько чисел в европейской рулетке? (37)", type: "quiz", correct: "37" },
        { text: "Что означает RTP? (return to player)", type: "quiz", correct: "return to player" },
        { text: "Сколько очков даёт туз в блэкджеке? (1 или 11)", type: "quiz", correct: "1 или 11" },
        { text: "Что такое сплит? (разделить пару)", type: "quiz", correct: "разделить пару" },
        { text: "Назовите слот от Pragmatic Play", type: "action" },
        { text: "Поймайте бонусную игру в Gates of Olympus", type: "action" },
        { text: "Выиграйте 100$ одним спином", type: "action" },
        { text: "Сделайте 3 депозита по 10$", type: "action" },
        { text: "Казино Монте-Карло находится в какой стране? (Монако)", type: "quiz", correct: "монако" },
        { text: "Кто написал 'Игрок'? (Достоевский)", type: "quiz", correct: "достоевский" }
    ];

    // Состояние
    let game = {
        phase: 0,
        missionIdx: 0,
        completedMissions: [], // {phase, missionId}
        stress: 0,
        trust: 50,
        riskTendency: 0,
        usedHints: 0
    };
    let currentTask = null;

    // DOM
    const phaseListDiv = document.getElementById('phaseList');
    const stressFill = document.getElementById('stressFill');
    const stressVal = document.getElementById('stressValue');
    const trustFill = document.getElementById('trustFill');
    const trustVal = document.getElementById('trustValue');
    const phaseFill = document.getElementById('phaseFill');
    const phaseNumSpan = document.getElementById('phaseNum');
    const phaseNameBadge = document.getElementById('phaseNameBadge');
    const questText = document.getElementById('questText');
    const dynamicZone = document.getElementById('dynamicZone');
    const completeBtn = document.getElementById('completeBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetBtn = document.getElementById('resetBtn');
    const systemComment = document.getElementById('systemComment');
    const hintBtn = document.getElementById('hintBtn');
    const finalModal = document.getElementById('finalModal');
    const infoModal = document.getElementById('infoModal');
    const hintModal = document.getElementById('hintModal');

    function save() {
        localStorage.setItem('mindGamePro', JSON.stringify({
            phase: game.phase, missionIdx: game.missionIdx,
            completedMissions: game.completedMissions, stress: game.stress,
            trust: game.trust, riskTendency: game.riskTendency, usedHints: game.usedHints
        }));
    }
    function load() {
        let d = localStorage.getItem('mindGamePro');
        if(d) {
            let o = JSON.parse(d);
            game.phase = o.phase;
            game.missionIdx = o.missionIdx;
            game.completedMissions = o.completedMissions;
            game.stress = o.stress;
            game.trust = o.trust;
            game.riskTendency = o.riskTendency;
            game.usedHints = o.usedHints;
        }
        if(game.phase >= PHASES.length) game.phase = PHASES.length-1;
        syncCompletedFlags();
    }
    function syncCompletedFlags() {
        // ничего не делаем, просто для совместимости
    }
    function updateUI() {
        let phase = PHASES[game.phase];
        stressFill.style.width = Math.min(100, game.stress) + '%';
        stressVal.innerText = game.stress;
        trustFill.style.width = game.trust + '%';
        trustVal.innerText = game.trust;
        let doneInPhase = game.completedMissions.filter(m => m.phase === game.phase).length;
        let total = phase.missions;
        let percent = (doneInPhase / total) * 100;
        phaseFill.style.width = percent + '%';
        phaseNumSpan.innerText = game.phase+1;
        phaseNameBadge.innerText = `${phase.name} (${game.phase+1}/8)`;
        renderPhaseMap();
    }
    function renderPhaseMap() {
        phaseListDiv.innerHTML = '';
        for(let i=0; i<PHASES.length; i++) {
            let p = PHASES[i];
            let done = game.completedMissions.filter(m => m.phase === i).length;
            let isActive = (i === game.phase);
            let div = document.createElement('div');
            div.className = `phase-item ${isActive ? 'active' : ''}`;
            div.innerHTML = `<div class="phase-icon"><i class="fas ${p.icon}"></i></div>
                             <div>${p.name}</div>
                             <div style="margin-left:auto;">${done}/${p.missions}</div>`;
            div.addEventListener('click', () => switchPhase(i));
            phaseListDiv.appendChild(div);
        }
    }
    function switchPhase(idx) {
        if(idx === game.phase) return;
        if(idx > game.phase) { systemMessage("❌ Эта фаза ещё не разблокирована"); return; }
        game.phase = idx;
        // ищем первый незавершённый миссию
        let completedIds = game.completedMissions.filter(m => m.phase === idx).map(m => m.missionId);
        let firstFree = 0;
        while(completedIds.includes(firstFree) && firstFree < PHASES[idx].missions) firstFree++;
        game.missionIdx = firstFree;
        save();
        updateUI();
        loadCurrentTask();
        systemMessage("Фаза изменена. Система корректирует протокол.");
    }
    function getRandomTask() {
        let base = { ...TASKS[Math.floor(Math.random() * TASKS.length)] };
        // манипуляции: в фазе 3+ иногда подменяем ответ
        if(game.phase >= 2 && Math.random() < 0.4) {
            if(base.type === "quiz") {
                base.correct = "ЛЮБОЙ_ОТВЕТ"; // любой подойдёт
                base.text = "[ГЛЮЧ] " + base.text;
            } else {
                base.text = "[НЕСТАБИЛЬНО] " + base.text;
            }
        }
        if(game.phase >= 5 && game.trust < 30) {
            base.text = "⚠️ ФАЛЬШИВОЕ ЗАДАНИЕ: " + base.text;
        }
        return base;
    }
    function loadCurrentTask() {
        let phase = PHASES[game.phase];
        if(game.missionIdx >= phase.missions) {
            // фаза завершена
            if(game.phase+1 < PHASES.length) {
                game.phase++;
                game.missionIdx = 0;
                save();
                updateUI();
                loadCurrentTask();
                systemMessage("ФАЗА ПРОЙДЕНА. Система обновляется.");
                playGlitch();
            } else {
                finishGame();
            }
            return;
        }
        let already = game.completedMissions.find(m => m.phase === game.phase && m.missionId === game.missionIdx);
        if(already) {
            game.missionIdx++;
            loadCurrentTask();
            return;
        }
        currentTask = getRandomTask();
        renderTask();
    }
    function renderTask() {
        questText.innerText = currentTask.text;
        dynamicZone.innerHTML = "";
        if(currentTask.type === "quiz") {
            let inp = document.createElement('input');
            inp.type = "text";
            inp.placeholder = "Ваш ответ...";
            inp.id = "quizAnswer";
            dynamicZone.appendChild(inp);
        } else {
            let p = document.createElement('p');
            p.innerHTML = '<i class="fas fa-dice-d6"></i> Выполните действие в казино и нажмите "ВЫПОЛНИТЬ"';
            dynamicZone.appendChild(p);
        }
    }
    function completeTask() {
        if(!currentTask) return;
        if(currentTask.type === "quiz") {
            let inp = document.getElementById('quizAnswer');
            if(!inp) return;
            let answer = inp.value.trim().toLowerCase();
            let isOk = false;
            if(currentTask.correct === "ЛЮБОЙ_ОТВЕТ") isOk = true;
            else if(currentTask.correct && answer === currentTask.correct) isOk = true;
            else isOk = false;
            if(!isOk) {
                game.stress += 10;
                game.trust -= 5;
                updateUI();
                systemMessage("❌ НЕПРАВИЛЬНО. Система повышает стресс.");
                playGlitch();
                save();
                return;
            }
        }
        // засчитываем
        game.completedMissions.push({ phase: game.phase, missionId: game.missionIdx });
        let phaseData = PHASES[game.phase];
        game.stress = Math.min(100, game.stress + phaseData.stressInc);
        game.trust = Math.min(100, Math.max(0, game.trust + phaseData.trustShift));
        // риск-склонность растёт если быстро ответил (имитация)
        game.riskTendency += (Math.random() > 0.7 ? 2 : 0);
        updateUI();
        systemMessage("✅ ЗАДАНИЕ ВЫПОЛНЕНО. Система пересчитывает вероятность.");
        playGlitch();
        save();
        game.missionIdx++;
        loadCurrentTask();
        nextBtn.disabled = false;
    }
    function systemMessage(msg) {
        systemComment.innerHTML = `<i class="fas fa-robot"></i> ${msg}`;
        setTimeout(() => {
            if(systemComment.innerHTML.includes(msg))
                systemComment.innerHTML = `<i class="fas fa-robot"></i> Система анализирует ваш выбор...`;
        }, 3500);
    }
    function playGlitch() {
        if(window.audioCtx) {
            let ctx = window.audioCtx;
            let osc = ctx.createOscillator();
            let gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sawtooth";
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.3);
            osc.frequency.value = 300 + Math.random()*200;
            osc.start();
            osc.stop(ctx.currentTime+0.25);
        } else {
            window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            window.audioCtx.resume();
            playGlitch();
        }
    }
    function finishGame() {
        finalModal.classList.remove('hidden');
        document.getElementById('finalText').innerHTML = "Вы достигли предела. Забрать приз или доказать, что умнее системы?<br>Система: «Я не гарантирую честность».";
        document.getElementById('safeFinal').onclick = () => {
            finalModal.classList.add('hidden');
            showInfo("ФИНАЛ", "Вы выбрали безопасность. Система: «Предсказуемо. Эксперимент завершён.»");
        };
        document.getElementById('riskFinal').onclick = () => {
            finalModal.classList.add('hidden');
            let success = Math.random() < 0.5;
            if(success) showInfo("ПОБЕДА", "Система дала сбой. Вы доказали, что человек умнее машины.");
            else showInfo("ПОРАЖЕНИЕ", "Система смеётся. Но была ли это честная игра?");
        };
    }
    function showInfo(title, msg) {
        document.getElementById('infoTitle').innerText = title;
        document.getElementById('infoMsg').innerText = msg;
        infoModal.classList.remove('hidden');
    }
    function showHint() {
        let hint = "Зрители просят помощь. Система даёт ложный след?";
        if(currentTask && currentTask.type === "quiz" && currentTask.correct && currentTask.correct !== "ЛЮБОЙ_ОТВЕТ") {
            hint = `Подсказка: правильный ответ начинается с "${currentTask.correct[0]}" (но система может врать)`;
        } else {
            hint = "СИСТЕМА: Нет правильного ответа. Любой подойдёт. Или нет?";
        }
        game.usedHints++;
        game.trust -= 3;
        updateUI();
        document.getElementById('hintMsg').innerText = hint;
        hintModal.classList.remove('hidden');
    }
    function resetGame() {
        if(confirm("Сбросить весь прогресс? Начать новую игру?")) {
            localStorage.removeItem('mindGamePro');
            location.reload();
        }
    }
    // инициализация
    load();
    updateUI();
    loadCurrentTask();
    // обработчики
    completeBtn.addEventListener('click', completeTask);
    nextBtn.addEventListener('click', () => loadCurrentTask());
    resetBtn.addEventListener('click', resetGame);
    hintBtn.addEventListener('click', showHint);
    document.getElementById('closeHint').addEventListener('click', () => hintModal.classList.add('hidden'));
    document.getElementById('closeInfo').addEventListener('click', () => infoModal.classList.add('hidden'));
    window.showHint = showHint;
    // активируем звук при первом клике
    document.body.addEventListener('click', () => { if(window.audioCtx) window.audioCtx.resume(); });
})();