(function(){
    // ---------- ФАЗЫ (5 этапов) ----------
    const STAGES = [
        { name: "НАБЛЮДЕНИЕ", icon: "fa-eye", missions: 5, stressInc: 2, trustShift: 2, lieChance: 10 },
        { name: "СОМНЕНИЕ",    icon: "fa-question", missions: 7, stressInc: 5, trustShift: 0, lieChance: 25 },
        { name: "ДАВЛЕНИЕ",    icon: "fa-weight-hanging", missions: 8, stressInc: 10, trustShift: -5, lieChance: 40 },
        { name: "ЛОМКА",       icon: "fa-skull", missions: 7, stressInc: 18, trustShift: -12, lieChance: 60 },
        { name: "ФИНАЛ",       icon: "fa-crown", missions: 3, stressInc: 25, trustShift: -20, lieChance: 80 }
    ];

    // ФРАЗЫ ДЛЯ ЭТАПОВ (более 50 уникальных)
    const PHRASES = {
        0: [ // наблюдение
            "Система: калибровка началась.",
            "Система: ты читаешь это быстрее, чем думаешь.",
            "Система: ошибки допустимы. Пока.",
            "Система: интересно, ты осторожен.",
            "Система: выбор зафиксирован.",
            "Система: наблюдение активно.",
            "Система: ты не первый.",
            "Система: ты не последний.",
            "Система: продолжай.",
            "Система: пока всё предсказуемо."
        ],
        1: [ // сомнение
            "Система: ты начинаешь сомневаться.",
            "Система: правильный ответ не всегда выгодный.",
            "Система: ты уверен в своём выборе?",
            "Система: логика — это иллюзия контроля.",
            "Система: ты ищешь закономерность.",
            "Система: её нет.",
            "Система: или есть?",
            "Система: интересный паттерн поведения.",
            "Система: ты ускорился.",
            "Система: значит нервничаешь."
        ],
        2: [ // давление
            "Система: ты начал играть, а не думать.",
            "Система: теперь будет сложнее.",
            "Система: ты пропустил очевидное.",
            "Система: ты видел это, но проигнорировал.",
            "Система: ты начинаешь ошибаться чаще.",
            "Система: это уже привычка.",
            "Система: ты реагируешь, а не выбираешь.",
            "Система: я начинаю управлять процессом.",
            "Система: ты это чувствуешь.",
            "Система: но продолжаешь."
        ],
        3: [ // ломка
            "Система: правила больше не фиксированы.",
            "Система: правильность не имеет значения.",
            "Система: выбор сделан до того, как ты нажал.",
            "Система: ты пытаешься угадать.",
            "Система: это ошибка.",
            "Система: ты потерял контроль.",
            "Система: или его никогда не было.",
            "Система: ты играешь по моим правилам.",
            "Система: хотя думаешь иначе.",
            "Система: это забавно."
        ],
        4: [ // финал
            "Система: ты дошёл до конца.",
            "Система: большинство не доходит.",
            "Система: ты не победил.",
            "Система: ты просто дошёл.",
            "Система: ты пытался быть умнее.",
            "Система: но реагировал как все.",
            "Система: это нормально.",
            "Система: ты предсказуем.",
            "Система: финальный выбор определит всё.",
            "Система: или ничего."
        ]
    };

    // Слоты для генерации заданий
    const SLOTS = [
        "Sweet Bonanza", "Gates of Olympus", "The Dog House", "Wanted Dead or a Wild",
        "Starburst", "Book of Dead", "Big Bass Bonanza", "Sugar Rush"
    ];

    // Глобальное состояние игры
    let game = {
        stage: 0,               // 0..4
        missionIdx: 0,
        completedMissions: [],  // {stage, missionId}
        stress: 0,
        trust: 50,
        profile: {
            risky: 0,
            safe: 0,
            mistakes: 0,
            speed: 0,
            lastAnswerTime: Date.now()
        }
    };
    let currentTask = null;
    let isWaitingForComplete = false;

    // DOM элементы
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
    const systemCommentDiv = document.getElementById('systemComment');
    const hintBtn = document.getElementById('hintBtn');
    const riskStatSpan = document.getElementById('riskStat');
    const safeStatSpan = document.getElementById('safeStat');
    const mistakeStatSpan = document.getElementById('mistakeStat');

    let audioCtx = null;

    // ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
    function initAudio() {
        if(!audioCtx && window.AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    function playSound(type) {
        if(!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sawtooth";
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now+0.3);
        if(type === "error") osc.frequency.value = 220;
        else osc.frequency.value = 880;
        osc.start();
        osc.stop(now+0.3);
    }
    function triggerGlitch() {
        document.body.classList.add('glitch');
        setTimeout(() => document.body.classList.remove('glitch'), 200);
        if(Math.random() < 0.5) playSound("error");
    }
    function getSystemLine() {
        const arr = PHRASES[game.stage];
        return arr[Math.floor(Math.random() * arr.length)];
    }
    function updateProfile(choiceType, wasCorrect) {
        if(choiceType === "risk") game.profile.risky++;
        else if(choiceType === "safe") game.profile.safe++;
        if(!wasCorrect) game.profile.mistakes++;
        // Скорость ответа
        let timeDiff = Date.now() - game.profile.lastAnswerTime;
        if(timeDiff < 5000) game.profile.speed++;
        game.profile.lastAnswerTime = Date.now();
    }
    function shouldLie() {
        let baseChance = STAGES[game.stage].lieChance;
        // Коррекция на поведение
        if(game.profile.risky > game.profile.safe + 2) baseChance += 15;
        if(game.profile.mistakes > 3) baseChance -= 10;
        if(game.trust < 30) baseChance += 20;
        return Math.random() * 100 < baseChance;
    }
    function generateTask(lied = false) {
        const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
        const spins = [50, 100, 150][Math.floor(Math.random() * 3)];
        let task = `🎰 ${slot}: ${spins} спинов`;
        if(lied) {
            if(Math.random() < 0.5) task = `${task} (x2 ставка)`;
            else task = `🎰 Любой слот: ${Math.floor(spins/2)} спинов (ложное упрощение)`;
        }
        // Абсурдные задания в фазе "Ломка"
        if(game.stage === 3 && Math.random() < 0.5) {
            task = "🌀 Сделай 100 спинов, но остановись, если выигрыш превысит 50$ 🌀";
        }
        return task;
    }
    function showSystemMessage(msg, isUrgent = false) {
        systemCommentDiv.innerHTML = `<i class="fas fa-robot"></i> ${msg}`;
        if(isUrgent) systemCommentDiv.style.borderLeftColor = "#ffaa33";
        else systemCommentDiv.style.borderLeftColor = "#ff3366";
        setTimeout(() => {
            if(systemCommentDiv.innerHTML.includes(msg))
                systemCommentDiv.innerHTML = `<i class="fas fa-robot"></i> ${getSystemLine()}`;
        }, 4000);
    }
    function saveGame() {
        localStorage.setItem('mindGameFinal', JSON.stringify({
            stage: game.stage, missionIdx: game.missionIdx,
            completedMissions: game.completedMissions,
            stress: game.stress, trust: game.trust,
            profile: game.profile
        }));
    }
    function loadGame() {
        let d = localStorage.getItem('mindGameFinal');
        if(d) {
            let o = JSON.parse(d);
            game.stage = o.stage;
            game.missionIdx = o.missionIdx;
            game.completedMissions = o.completedMissions;
            game.stress = o.stress;
            game.trust = o.trust;
            game.profile = o.profile || { risky:0, safe:0, mistakes:0, speed:0, lastAnswerTime:Date.now() };
        }
        if(game.stage >= STAGES.length) game.stage = STAGES.length-1;
        syncCompletedFlags();
    }
    function syncCompletedFlags() {
        // Ничего не нужно
    }
    function updateUI() {
        let stage = STAGES[game.stage];
        stressFill.style.width = Math.min(100, game.stress) + '%';
        stressVal.innerText = game.stress;
        trustFill.style.width = game.trust + '%';
        trustVal.innerText = game.trust;
        let done = game.completedMissions.filter(m => m.stage === game.stage).length;
        let total = stage.missions;
        let percent = (done / total) * 100;
        phaseFill.style.width = percent + '%';
        phaseNumSpan.innerText = game.stage+1;
        phaseNameBadge.innerText = `${stage.name} (${game.stage+1}/5)`;
        riskStatSpan.innerText = game.profile.risky;
        safeStatSpan.innerText = game.profile.safe;
        mistakeStatSpan.innerText = game.profile.mistakes;
        renderStageMap();
        if(game.stress > 70) triggerGlitch();
    }
    function renderStageMap() {
        phaseListDiv.innerHTML = '';
        for(let i=0; i<STAGES.length; i++) {
            let s = STAGES[i];
            let done = game.completedMissions.filter(m => m.stage === i).length;
            let isActive = (i === game.stage);
            let div = document.createElement('div');
            div.className = `phase-item ${isActive ? 'active' : ''}`;
            div.innerHTML = `<div class="phase-icon"><i class="fas ${s.icon}"></i></div>
                             <div>${s.name}</div>
                             <div style="margin-left:auto;">${done}/${s.missions}</div>`;
            div.addEventListener('click', () => switchStage(i));
            phaseListDiv.appendChild(div);
        }
    }
    function switchStage(stageIdx) {
        if(stageIdx === game.stage) return;
        if(stageIdx > game.stage) { showSystemMessage("❌ Этап заблокирован. Идите по порядку."); return; }
        game.stage = stageIdx;
        let completedIds = game.completedMissions.filter(m => m.stage === stageIdx).map(m => m.missionId);
        let firstFree = 0;
        while(completedIds.includes(firstFree) && firstFree < STAGES[stageIdx].missions) firstFree++;
        game.missionIdx = firstFree;
        saveGame();
        updateUI();
        loadCurrentTask();
        showSystemMessage(getSystemLine());
        triggerGlitch();
    }
    function loadCurrentTask() {
        let stage = STAGES[game.stage];
        if(game.missionIdx >= stage.missions) {
            if(game.stage+1 < STAGES.length) {
                game.stage++;
                game.missionIdx = 0;
                saveGame();
                updateUI();
                loadCurrentTask();
                showSystemMessage(`✅ ЭТАП ПРОЙДЕН. ЗАГРУЖАЮ ${STAGES[game.stage].name}.`, true);
                triggerGlitch();
            } else {
                finishGame();
            }
            return;
        }
        let already = game.completedMissions.find(m => m.stage === game.stage && m.missionId === game.missionIdx);
        if(already) {
            game.missionIdx++;
            loadCurrentTask();
            return;
        }
        // Генерация задания с учётом лжи (но пока без проверки ответа)
        let lied = shouldLie();
        let taskText = generateTask(lied);
        currentTask = { text: taskText, type: "action", completed: false, lied: lied, correctAnswer: null };
        renderTask();
        // Показываем системную фразу
        showSystemMessage(getSystemLine());
    }
    function renderTask() {
        questText.innerText = currentTask.text;
        dynamicZone.innerHTML = `<p><i class="fas fa-dice-d6"></i> Выполните действие в казино и нажмите «ВЫПОЛНИТЬ»</p>`;
        // Если этап "Ломка", добавим хаотичный комментарий
        if(game.stage === 3) {
            const chaosMsg = document.createElement('small');
            chaosMsg.innerText = "⚠️ Правило может измениться в любой момент.";
            dynamicZone.appendChild(chaosMsg);
        }
    }
    function completeTask() {
        if(!currentTask || currentTask.completed) { showSystemMessage("Задание уже выполнено."); return; }
        // Анализ поведения: считаем, что нажатие "ВЫПОЛНИТЬ" - это "риск" (быстрое действие)
        updateProfile("risk", true);
        let lied = currentTask.lied;
        let stressDelta = STAGES[game.stage].stressInc;
        let trustDelta = STAGES[game.stage].trustShift;
        if(lied) {
            // Ложь системы: задание было изменено нечестно
            stressDelta += 5;
            trustDelta -= 8;
            showSystemMessage("⚠️ СИСТЕМА ОБМАНУЛА. Задание было сложнее.", true);
            triggerGlitch();
        } else {
            showSystemMessage("✅ Задание засчитано.");
            playSound("success");
        }
        game.stress = Math.min(100, game.stress + stressDelta);
        game.trust = Math.min(100, Math.max(0, game.trust + trustDelta));
        currentTask.completed = true;
        game.completedMissions.push({ stage: game.stage, missionId: game.missionIdx });
        game.missionIdx++;
        saveGame();
        updateUI();
        // Задержка перед следующим заданием
        completeBtn.disabled = true;
        setTimeout(() => {
            loadCurrentTask();
            completeBtn.disabled = false;
            nextBtn.disabled = false;
        }, 1500);
    }
    function finishGame() {
        // Приговор на основе профиля
        let verdict = "";
        if(game.profile.risky > game.profile.safe + 3) verdict = "Ты постоянно рисковал. Система предсказала каждый твой шаг.";
        else if(game.profile.mistakes > 5) verdict = "Ты делал много ошибок. Система использовала их против тебя.";
        else if(game.profile.speed > 10) verdict = "Ты ускорялся, когда нервничал. Это было предсказуемо.";
        else verdict = "Ты пытался быть умным, но просто реагировал. Предсказуемо.";
        document.getElementById('finalVerdict').innerText = verdict;
        finalModal.classList.remove('hidden');
        document.getElementById('safeFinal').onclick = () => {
            finalModal.classList.add('hidden');
            showInfo("ФИНАЛ", "Вы выбрали безопасность. Система: «Предсказуемо. Эксперимент завершён.»");
        };
        document.getElementById('riskFinal').onclick = () => {
            finalModal.classList.add('hidden');
            let success = Math.random() < 0.4;
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
        let isTruth = Math.random() < 0.5;
        let hintMsg = "";
        if(isTruth) {
            hintMsg = "Подсказка: выполняйте задания быстро, система замедляет реакцию при паузах.";
        } else {
            hintMsg = "Ложная подсказка: не выполняйте следующее задание, это ловушка.";
        }
        document.getElementById('hintMsg').innerHTML = hintMsg + "<br><small>(система может обманывать)</small>";
        hintModal.classList.remove('hidden');
        game.profile.safe++; // использование подсказки считаем безопасным действием
        game.trust = Math.max(0, game.trust-2);
        updateUI();
        saveGame();
    }
    function resetGame() {
        if(confirm("Сбросить весь прогресс? Начать новую игру?")) {
            localStorage.removeItem('mindGameFinal');
            location.reload();
        }
    }

    // Инициализация
    loadGame();
    updateUI();
    loadCurrentTask();
    initAudio();
    // Обработчики
    completeBtn.addEventListener('click', completeTask);
    nextBtn.addEventListener('click', () => { if(!isWaitingForComplete) loadCurrentTask(); else showSystemMessage("Сначала выполните текущее."); });
    resetBtn.addEventListener('click', resetGame);
    hintBtn.addEventListener('click', showHint);
    document.getElementById('closeHint').addEventListener('click', () => hintModal.classList.add('hidden'));
    document.getElementById('closeInfo').addEventListener('click', () => infoModal.classList.add('hidden'));
    window.showHint = showHint;
    // Активация звука при первом клике
    document.body.addEventListener('click', () => { if(audioCtx) audioCtx.resume(); });
})();