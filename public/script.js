(function(){
    // ========== ЭТАПЫ ИГРЫ (5 этапов, суммарно 30+ заданий) ==========
    const STAGES = [
        { name: "НАБЛЮДЕНИЕ", icon: "fa-eye", missions: 5, stressInc: 2, trustShift: 2, lieChance: 10 },
        { name: "СОМНЕНИЕ",    icon: "fa-question", missions: 7, stressInc: 5, trustShift: 0, lieChance: 25 },
        { name: "ДАВЛЕНИЕ",    icon: "fa-weight-hanging", missions: 8, stressInc: 10, trustShift: -5, lieChance: 40 },
        { name: "ЛОМКА",       icon: "fa-skull", missions: 7, stressInc: 18, trustShift: -12, lieChance: 60 },
        { name: "ФИНАЛ",       icon: "fa-crown", missions: 3, stressInc: 25, trustShift: -20, lieChance: 80 }
    ];

    // ========== ФРАЗЫ СИСТЕМЫ (50+ уникальных) ==========
    const PHRASES = {
        0: [
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
        1: [
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
        2: [
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
        3: [
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
        4: [
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

    // ========== СОСТОЯНИЕ ИГРЫ ==========
    let game = {
        stage: 0,
        missionIdx: 0,
        completedMissions: [],   // {stage, missionId}
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

    // ========== DOM ЭЛЕМЕНТЫ ==========
    const els = {
        phaseList: document.getElementById('phaseList'),
        stressFill: document.getElementById('stressFill'),
        stressValue: document.getElementById('stressValue'),
        trustFill: document.getElementById('trustFill'),
        trustValue: document.getElementById('trustValue'),
        phaseFill: document.getElementById('phaseFill'),
        phaseNum: document.getElementById('phaseNum'),
        phaseNameBadge: document.getElementById('phaseNameBadge'),
        questText: document.getElementById('questText'),
        dynamicZone: document.getElementById('dynamicZone'),
        completeBtn: document.getElementById('completeBtn'),
        nextBtn: document.getElementById('nextBtn'),
        resetBtn: document.getElementById('resetBtn'),
        systemComment: document.getElementById('systemComment'),
        hintBtn: document.getElementById('hintBtn'),
        riskStat: document.getElementById('riskStat'),
        safeStat: document.getElementById('safeStat'),
        mistakeStat: document.getElementById('mistakeStat')
    };

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    function getSystemLine() {
        const arr = PHRASES[game.stage] || PHRASES[0];
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function showSystemMessage(msg, isUrgent = false) {
        els.systemComment.innerHTML = `<i class="fas fa-robot"></i> ${msg}`;
        if(isUrgent) els.systemComment.style.borderLeftColor = "#ffaa33";
        else els.systemComment.style.borderLeftColor = "#ff3366";
        setTimeout(() => {
            if(els.systemComment.innerHTML.includes(msg))
                els.systemComment.innerHTML = `<i class="fas fa-robot"></i> ${getSystemLine()}`;
        }, 4000);
    }

    function triggerGlitch() {
        document.body.classList.add('glitch');
        setTimeout(() => document.body.classList.remove('glitch'), 200);
        // имитация звука глитча
        if(window.audioCtx) {
            const osc = window.audioCtx.createOscillator();
            const gain = window.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(window.audioCtx.destination);
            osc.type = "sawtooth";
            gain.gain.setValueAtTime(0.08, window.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, window.audioCtx.currentTime+0.3);
            osc.frequency.value = 300 + Math.random()*200;
            osc.start();
            osc.stop(window.audioCtx.currentTime+0.25);
        }
    }

    function updateProfile(choiceType, wasCorrect) {
        if(choiceType === "risk") game.profile.risky++;
        else if(choiceType === "safe") game.profile.safe++;
        if(!wasCorrect) game.profile.mistakes++;
        let timeDiff = Date.now() - game.profile.lastAnswerTime;
        if(timeDiff < 5000) game.profile.speed++;
        game.profile.lastAnswerTime = Date.now();
    }

    function shouldLie() {
        let base = STAGES[game.stage].lieChance;
        if(game.profile.risky > game.profile.safe + 2) base += 15;
        if(game.profile.mistakes > 3) base -= 10;
        if(game.trust < 30) base += 20;
        return Math.random() * 100 < base;
    }

    function generateTask(lied) {
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

    function updateUI() {
        const stage = STAGES[game.stage];
        const done = game.completedMissions.filter(m => m.stage === game.stage).length;
        const percent = (done / stage.missions) * 100;
        els.phaseFill.style.width = percent + '%';
        els.stressFill.style.width = Math.min(100, game.stress) + '%';
        els.stressValue.innerText = game.stress;
        els.trustFill.style.width = game.trust + '%';
        els.trustValue.innerText = game.trust;
        els.phaseNum.innerText = game.stage + 1;
        els.phaseNameBadge.innerText = `${stage.name} (${game.stage+1}/5)`;
        els.riskStat.innerText = game.profile.risky;
        els.safeStat.innerText = game.profile.safe;
        els.mistakeStat.innerText = game.profile.mistakes;
        renderStageMap();
        if(game.stress > 70) triggerGlitch();
    }

    function renderStageMap() {
        els.phaseList.innerHTML = '';
        STAGES.forEach((s, idx) => {
            const done = game.completedMissions.filter(m => m.stage === idx).length;
            const div = document.createElement('div');
            div.className = `phase-item ${idx === game.stage ? 'active' : ''}`;
            div.innerHTML = `<div class="phase-icon"><i class="fas ${s.icon}"></i></div>
                             <div>${s.name}</div>
                             <div style="margin-left:auto;">${done}/${s.missions}</div>`;
            div.addEventListener('click', () => switchStage(idx));
            els.phaseList.appendChild(div);
        });
    }

    function switchStage(idx) {
        if(idx === game.stage) return;
        if(idx > game.stage) { showSystemMessage("❌ Этап заблокирован. Идите по порядку."); return; }
        game.stage = idx;
        const completedIds = game.completedMissions.filter(m => m.stage === idx).map(m => m.missionId);
        let firstFree = 0;
        while(completedIds.includes(firstFree) && firstFree < STAGES[idx].missions) firstFree++;
        game.missionIdx = firstFree;
        saveGame();
        updateUI();
        loadCurrentTask();
        showSystemMessage(getSystemLine());
        triggerGlitch();
    }

    function loadCurrentTask() {
        const stage = STAGES[game.stage];
        if(game.missionIdx >= stage.missions) {
            if(game.stage + 1 < STAGES.length) {
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
        const already = game.completedMissions.find(m => m.stage === game.stage && m.missionId === game.missionIdx);
        if(already) {
            game.missionIdx++;
            loadCurrentTask();
            return;
        }
        const lied = shouldLie();
        const taskText = generateTask(lied);
        currentTask = { text: taskText, type: "action", completed: false, lied: lied };
        els.questText.innerText = taskText;
        els.dynamicZone.innerHTML = `<p><i class="fas fa-dice-d6"></i> Выполните действие в казино и нажмите «ВЫПОЛНИТЬ»</p>`;
        if(game.stage === 3) {
            const chaosMsg = document.createElement('small');
            chaosMsg.innerText = "⚠️ Правило может измениться в любой момент.";
            els.dynamicZone.appendChild(chaosMsg);
        }
        showSystemMessage(getSystemLine());
    }

    function completeTask() {
        if(!currentTask || currentTask.completed) { showSystemMessage("Задание уже выполнено."); return; }
        // Анализ поведения: считаем нажатие "Выполнить" как риск (быстрое действие)
        updateProfile("risk", true);
        let stressDelta = STAGES[game.stage].stressInc;
        let trustDelta = STAGES[game.stage].trustShift;
        if(currentTask.lied) {
            stressDelta += 5;
            trustDelta -= 8;
            showSystemMessage("⚠️ СИСТЕМА ОБМАНУЛА. Задание было сложнее.", true);
            triggerGlitch();
        } else {
            showSystemMessage("✅ Задание засчитано.");
        }
        game.stress = Math.min(100, game.stress + stressDelta);
        game.trust = Math.min(100, Math.max(0, game.trust + trustDelta));
        currentTask.completed = true;
        game.completedMissions.push({ stage: game.stage, missionId: game.missionIdx });
        game.missionIdx++;
        saveGame();
        updateUI();
        // Задержка перед следующим заданием
        els.completeBtn.disabled = true;
        setTimeout(() => {
            loadCurrentTask();
            els.completeBtn.disabled = false;
            els.nextBtn.disabled = false;
        }, 1200);
    }

    function finishGame() {
        let verdict = "";
        if(game.profile.risky > game.profile.safe + 3) verdict = "Ты постоянно рисковал. Система предсказала каждый твой шаг.";
        else if(game.profile.mistakes > 5) verdict = "Ты делал много ошибок. Система использовала их против тебя.";
        else if(game.profile.speed > 10) verdict = "Ты ускорялся, когда нервничал. Это было предсказуемо.";
        else verdict = "Ты пытался быть умным, но просто реагировал. Предсказуемо.";
        document.getElementById('finalVerdict').innerText = verdict;
        document.getElementById('finalModal').classList.remove('hidden');
        document.getElementById('safeFinal').onclick = () => {
            document.getElementById('finalModal').classList.add('hidden');
            showInfo("ФИНАЛ", "Вы выбрали безопасность. Система: «Предсказуемо. Эксперимент завершён.»");
        };
        document.getElementById('riskFinal').onclick = () => {
            document.getElementById('finalModal').classList.add('hidden');
            const success = Math.random() < 0.4;
            if(success) showInfo("ПОБЕДА", "Система дала сбой. Вы доказали, что человек умнее машины.");
            else showInfo("ПОРАЖЕНИЕ", "Система смеётся. Но была ли это честная игра?");
        };
    }

    function showInfo(title, msg) {
        document.getElementById('infoTitle').innerText = title;
        document.getElementById('infoMsg').innerText = msg;
        document.getElementById('infoModal').classList.remove('hidden');
    }

    function showHint() {
        const isTruth = Math.random() < 0.5;
        let hintMsg;
        if(isTruth) {
            hintMsg = "Подсказка: выполняйте задания быстро, система замедляет реакцию при паузах.";
        } else {
            hintMsg = "Ложная подсказка: не выполняйте следующее задание, это ловушка.";
        }
        document.getElementById('hintMsg').innerHTML = hintMsg + "<br><small>(система может обманывать)</small>";
        document.getElementById('hintModal').classList.remove('hidden');
        game.profile.safe++;
        game.trust = Math.max(0, game.trust - 2);
        updateUI();
        saveGame();
    }

    function resetGame() {
        if(confirm("Сбросить весь прогресс? Начать новую игру?")) {
            localStorage.removeItem('mindGameFinal');
            location.reload();
        }
    }

    function saveGame() {
        localStorage.setItem('mindGameFinal', JSON.stringify({
            stage: game.stage,
            missionIdx: game.missionIdx,
            completedMissions: game.completedMissions,
            stress: game.stress,
            trust: game.trust,
            profile: game.profile
        }));
    }

    function loadGame() {
        const saved = localStorage.getItem('mindGameFinal');
        if(saved) {
            const data = JSON.parse(saved);
            game.stage = data.stage;
            game.missionIdx = data.missionIdx;
            game.completedMissions = data.completedMissions;
            game.stress = data.stress;
            game.trust = data.trust;
            game.profile = data.profile || { risky:0, safe:0, mistakes:0, speed:0, lastAnswerTime:Date.now() };
        }
        if(game.stage >= STAGES.length) game.stage = STAGES.length - 1;
    }

    // ========== ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ ==========
    loadGame();
    updateUI();
    loadCurrentTask();

    // Звуковой контекст (по клику включаем)
    window.audioCtx = null;
    document.body.addEventListener('click', () => {
        if(!window.audioCtx && window.AudioContext) {
            window.audioCtx = new AudioContext();
            window.audioCtx.resume();
        }
    });

    els.completeBtn.addEventListener('click', completeTask);
    els.nextBtn.addEventListener('click', () => loadCurrentTask());
    els.resetBtn.addEventListener('click', resetGame);
    els.hintBtn.addEventListener('click', showHint);
    document.getElementById('closeHint')?.addEventListener('click', () => document.getElementById('hintModal').classList.add('hidden'));
    document.getElementById('closeInfo')?.addEventListener('click', () => document.getElementById('infoModal').classList.add('hidden'));
    window.showHint = showHint;

    console.log("Игра разума загружена. Приятного психологического эксперимента!");
})();