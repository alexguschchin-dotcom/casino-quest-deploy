(function(){
    // ========== ЭТАПЫ ИГРЫ ==========
    const STAGES = [
        { name: "ДОВЕРИЕ", icon: "fa-hand-peace", missions: 5, stressInc: 2, trustShift: 2, lieChance: 10 },
        { name: "СОМНЕНИЕ", icon: "fa-question", missions: 7, stressInc: 5, trustShift: 0, lieChance: 25 },
        { name: "ДАВЛЕНИЕ", icon: "fa-weight-hanging", missions: 8, stressInc: 10, trustShift: -5, lieChance: 40 },
        { name: "ЛОМКА", icon: "fa-skull", missions: 7, stressInc: 18, trustShift: -12, lieChance: 60 },
        { name: "ФИНАЛ", icon: "fa-crown", missions: 3, stressInc: 25, trustShift: -20, lieChance: 80 }
    ];

    // ========== ФРАЗЫ (50+) ==========
    const PHRASES = {
        0: ["Система: калибровка началась.","Система: ошибки допустимы. Пока.","Система: пока всё предсказуемо.","Система: продолжай.","Система: ты не первый."],
        1: ["Система: ты начинаешь сомневаться.","Система: правильный ответ не всегда выгодный.","Система: ты ищешь закономерность… её нет.","Система: интересный паттерн поведения.","Система: ты ускорился — значит нервничаешь."],
        2: ["Система: ты начал играть, а не думать.","Система: теперь будет сложнее.","Система: ты пропустил очевидное.","Система: ты реагируешь, а не выбираешь.","Система: я начинаю управлять процессом."],
        3: ["Система: правила больше не фиксированы.","Система: правильность не имеет значения.","Система: ты потерял контроль.","Система: ты играешь по моим правилам.","Система: это забавно."],
        4: ["Система: ты дошёл до конца.","Система: ты не победил, ты просто дошёл.","Система: ты пытался быть умнее.","Система: ты предсказуем.","Система: финальный выбор определит всё."]
    };

    // ========== БАНК ЗАДАНИЙ (психологические выборы) ==========
    // Каждый элемент: текст, варианты { A, B }, возможное ложное условие, метка типа (risk/safe/trust)
    const CHOICE_TASKS = [
        { text: "Ты уверен, что хочешь думать? Иногда лучше просто выбрать.", 
          options: ["🟢 Сделать 50 спинов (безопасно)", "🔴 Сделать 30 спинов с x2 ставки (риск)"], 
          type: "risk_safe", stressA: 2, stressB: 8, trustA: 3, trustB: -2 },
        { text: "Чат советует риск. Но чат не проигрывает — ты проигрываешь.", 
          options: ["🟢 Прислушаться к чату (100 спинов)", "🔴 Игнорировать чат (60 спинов, но x1.5)"], 
          type: "social", stressA: 5, stressB: 3, trustA: -5, trustB: 2 },
        { text: "Я могу помочь тебе сейчас. Но ты должен довериться.", 
          options: ["🤝 Довериться системе (получить подсказку, но возможно ложную)", "👎 Отказаться (сделать 70 спинов без подсказки)"],
          type: "trust", stressA: 4, stressB: 2, trustA: 10, trustB: -5 },
        { text: "Это лёгкий вопрос. Обычно такие заканчиваются плохо.", 
          options: ["🌀 Выбрать простой путь (50 спинов)", "⚡ Выбрать сложный путь (80 спинов с условием выигрыша)"],
          type: "trap", stressA: 4, stressB: 12, trustA: 0, trustB: -5 },
        { text: "Ты начинаешь понимать… Это проблема.", 
          options: ["🧠 Продолжать анализировать (60 спинов)", "😶 Отключить логику (40 спинов, но +стресс)"],
          type: "meta", stressA: 8, stressB: 5, trustA: -3, trustB: 2 },
        { text: "Сделай выбор за 5 секунд. Без помощи чата.", 
          options: ["⏱️ Быстрый выбор (100 спинов)", "⏸️ Замедлиться и пропустить ход (штраф +20 спинов позже)"],
          type: "timer", stressA: 10, stressB: 5, trustA: -8, trustB: 2 },
        { text: "Ты игнорируешь чат, когда нервничаешь. Давай проверим.", 
          options: ["📢 Слушать чат (выполнить то, что скажут зрители)", "🔇 Игнорировать (50 спинов, но система запомнит)"],
          type: "observation", stressA: 4, stressB: 2, trustA: 5, trustB: -3 },
        { text: "Ты всегда выбираешь риск. Это предсказуемо.", 
          options: ["🔥 Продолжить риск (30 спинов x3)", "🛡️ Попробовать безопасность (100 спинов, но снижение стресса)"],
          type: "pattern", stressA: 15, stressB: -5, trustA: -10, trustB: 5 },
        { text: "Система дала тебе иллюзию, что ты понял закономерность. Теперь ловушка.", 
          options: ["🎲 Выбрать то же, что и раньше (риск)", "🔄 Выбрать противоположное (безопасно, но сомнение)"],
          type: "inversion", stressA: 12, stressB: 2, trustA: -8, trustB: 0 },
        { text: "Ты пытаешься выглядеть умнее перед чатом. Докажи.", 
          options: ["🎤 Объяснить свой выбор (задание засчитается автоматически)", "😶 Молча выполнить 80 спинов"],
          type: "meta_show", stressA: 0, stressB: 8, trustA: 10, trustB: -5 },
        { text: "Если ты проиграешь — это будет из-за тебя.", 
          options: ["🟢 Безопасно (40 спинов)", "🔴 Риск (80 спинов, но при проигрыше +20 штраф)"],
          type: "guilt", stressA: 2, stressB: 12, trustA: 0, trustB: -5 },
        { text: "Ты должен выбрать: потерять 30 спинов или удвоить следующий риск.", 
          options: ["💔 Потерять 30 спинов", "⚡ Удвоить следующий риск"],
          type: "noluck", stressA: 5, stressB: 8, trustA: -5, trustB: -2 },
        { text: "Чат может голосовать, но 30% голосов — подделка. Доверишься?", 
          options: ["🗳️ Довериться чату (сделать то, что выберут зрители)", "🤖 Игнорировать (сделать 100 спинов самому)"],
          type: "paranoia", stressA: 10, stressB: 4, trustA: -10, trustB: 5 }
    ];

    // Дополнительные задания с таймером (появятся отдельно)
    const TIMER_TASKS = [
        { text: "У тебя 7 секунд. Выбери: A: 50 спинов, B: 30 спинов x2", time: 7, options: ["A (50 спинов)", "B (30 спинов x2)"] }
    ];

    // ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ИГРОКА ==========
    let player = {
        riskLevel: 0,        // сколько раз выбирал риск
        trustSystem: 50,     // доверие к системе (0-100)
        stress: 0,           // текущий стресс (0-100)
        lastChoices: [],     // массив последних выборов (тип)
        patternCounter: 0,   // счётчик подряд одинаковых выборов
        fastDecisions: 0,    // количество быстрых решений
        hintUsed: false
    };

    // ========== СОСТОЯНИЕ ИГРЫ (сохраняемое) ==========
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
    let activeTimer = null;
    let timerInterval = null;
    let choiceResolve = null;

    // ========== DOM ==========
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

    // ========== ВСПОМОГАТЕЛЬНЫЕ ==========
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

    function updatePlayerProfile(choiceType, chosenIndex, task) {
        // Обновляем риск/безопасность
        if (choiceType === "risk") {
            player.riskLevel++;
            game.profile.risky++;
        } else if (choiceType === "safe") {
            game.profile.safe++;
        }
        // Проверяем паттерн: последние 3 выбора одного типа?
        player.lastChoices.push(choiceType);
        if (player.lastChoices.length > 3) player.lastChoices.shift();
        if (player.lastChoices.length === 3 && player.lastChoices.every(v => v === "risk")) {
            player.patternCounter++;
            showSystemMessage("🔍 Система замечает: ты всегда выбираешь риск. Это предсказуемо.", true);
        } else {
            player.patternCounter = 0;
        }
        // Скорость выбора (засекаем время)
        let timeDiff = Date.now() - (game.profile.lastAnswerTime || Date.now());
        if (timeDiff < 3000) {
            player.fastDecisions++;
            game.profile.speed++;
        }
        game.profile.lastAnswerTime = Date.now();
    }

    // Функция для применения последствий выбора
    function applyChoiceConsequences(task, chosenIndex) {
        let isRisk = (chosenIndex === 1 && task.options[1].includes("🔴")) || (task.type === "risk_safe" && chosenIndex === 1);
        let stressDelta = 0, trustDelta = 0;
        if (task.stressA !== undefined && task.stressB !== undefined) {
            stressDelta = chosenIndex === 0 ? task.stressA : task.stressB;
            trustDelta = chosenIndex === 0 ? task.trustA : task.trustB;
        } else {
            // Стандартная логика
            stressDelta = isRisk ? 8 : 2;
            trustDelta = isRisk ? -5 : 3;
        }
        // Модификация от ложной закономерности или лжи системы
        let lied = (Math.random() * 100 < STAGES[game.stage].lieChance);
        if (lied && task.type !== "inversion") {
            stressDelta += 5;
            trustDelta -= 8;
            showSystemMessage("⚠️ Система изменила правила. Последствия усилены.", true);
            triggerGlitch();
        }
        // Инверсия: если игрок выбрал то же, что и раньше, а система обещала ловушку
        if (task.type === "inversion" && player.patternCounter > 0) {
            stressDelta += 10;
            trustDelta -= 10;
            showSystemMessage("💀 Ты попался на фальшивую закономерность.", true);
        }
        game.stress = Math.min(100, Math.max(0, game.stress + stressDelta));
        game.trust = Math.min(100, Math.max(0, game.trust + trustDelta));
        player.stress = game.stress;
        player.trustSystem = game.trust;
        updateUI();
        showSystemMessage(`Результат: стресс ${stressDelta>0?'+'+stressDelta:stressDelta}, доверие ${trustDelta>0?'+'+trustDelta:trustDelta}`);
        if (stressDelta > 10) triggerGlitch();
        // Сохраняем
        saveGame();
    }

    // Генерация задания (психологический выбор)
    function generateChoiceTask() {
        const stageIdx = game.stage;
        let taskPool = [...CHOICE_TASKS];
        // В фазе "Ломка" добавляем более хаотичные задания
        if (stageIdx === 3) {
            taskPool.push({ text: "Сделай 50 спинов. Не делай 50 спинов.", options: ["🌀 Сделать", "❌ Не делать"], type: "chaos", stressA: 5, stressB: 5, trustA: -5, trustB: -5 });
            taskPool.push({ text: "Остановись сейчас… или продолжай и потеряй больше", options: ["✋ Остановиться", "🔥 Продолжить"], type: "pressure", stressA: 2, stressB: 15, trustA: 5, trustB: -10 });
        }
        let task = taskPool[Math.floor(Math.random() * taskPool.length)];
        // иногда добавляем таймер
        let withTimer = (Math.random() < 0.25 && game.stress > 40);
        return { ...task, withTimer };
    }

    // Отображаем задание с выбором кнопок
    function renderChoiceTask(task) {
        els.dynamicZone.innerHTML = "";
        const btnContainer = document.createElement('div');
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "20px";
        btnContainer.style.marginTop = "20px";
        btnContainer.style.flexWrap = "wrap";
        task.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.style.background = "#0a0a0a";
            btn.style.border = "1px solid #0f0";
            btn.style.padding = "12px 24px";
            btn.style.borderRadius = "40px";
            btn.style.cursor = "pointer";
            btn.style.fontWeight = "bold";
            btn.style.fontFamily = "monospace";
            btn.onclick = () => {
                if (activeTimer) clearTimeout(activeTimer);
                if (timerInterval) clearInterval(timerInterval);
                const isRiskChoice = opt.includes("🔴") || opt.includes("риск") || (idx === 1 && task.type === "risk_safe");
                updatePlayerProfile(isRiskChoice ? "risk" : "safe", idx, task);
                applyChoiceConsequences(task, idx);
                // Засчитываем задание как выполненное
                currentTask.completed = true;
                game.completedMissions.push({ stage: game.stage, missionId: game.missionIdx });
                game.missionIdx++;
                saveGame();
                updateUI();
                els.completeBtn.disabled = true;
                setTimeout(() => {
                    loadCurrentTask();
                    els.completeBtn.disabled = false;
                    els.nextBtn.disabled = false;
                }, 1500);
            };
            btnContainer.appendChild(btn);
        });
        els.dynamicZone.appendChild(btnContainer);
        if (task.withTimer) {
            const timerDiv = document.createElement('div');
            timerDiv.id = "choiceTimer";
            timerDiv.style.marginTop = "15px";
            timerDiv.style.fontSize = "1.2rem";
            timerDiv.style.color = "#ffaa33";
            timerDiv.innerText = "⏱️ У вас 10 секунд на выбор!";
            els.dynamicZone.appendChild(timerDiv);
            let timeLeft = 10;
            activeTimer = setTimeout(() => {
                if (timerInterval) clearInterval(timerInterval);
                showSystemMessage("⏰ Время вышло! Система выбирает за вас... (риск)", true);
                // автоматически выбираем рискованный вариант
                const riskBtn = btnContainer.children[1] || btnContainer.children[0];
                if (riskBtn) riskBtn.click();
                activeTimer = null;
            }, 10000);
            timerInterval = setInterval(() => {
                timeLeft--;
                if (timerDiv) timerDiv.innerText = `⏱️ Осталось ${timeLeft} секунд`;
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
        }
    }

    // ========== ОСНОВНЫЕ ФУНКЦИИ УПРАВЛЕНИЯ ИГРОЙ ==========
    function updateUI() {
        const stage = STAGES[game.stage];
        const done = game.completedMissions.filter(m => m.stage === game.stage).length;
        const percent = (done / stage.missions) * 100;
        els.phaseFill.style.width = percent + '%';
        els.stressFill.style.width = game.stress + '%';
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
        if (activeTimer) clearTimeout(activeTimer);
        if (timerInterval) clearInterval(timerInterval);
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
        const taskData = generateChoiceTask();
        currentTask = {
            text: taskData.text,
            type: "choice",
            completed: false,
            options: taskData.options,
            stressA: taskData.stressA,
            stressB: taskData.stressB,
            trustA: taskData.trustA,
            trustB: taskData.trustB,
            withTimer: taskData.withTimer || false,
            taskType: taskData.type
        };
        els.questText.innerText = currentTask.text;
        renderChoiceTask(currentTask);
        showSystemMessage(getSystemLine());
    }

    function completeTask() {
        // В новой версии задача завершается нажатием на кнопку выбора.
        // Этот метод оставляем для совместимости, но он не нужен.
        showSystemMessage("Выберите один из вариантов, чтобы выполнить задание.");
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
        // Фальшивая подсказка (система может обманывать)
        const isTruth = Math.random() < 0.5;
        let hintMsg;
        if(isTruth) hintMsg = "Подсказка: сейчас лучше выбрать первый вариант (безопасный).";
        else hintMsg = "Ложная подсказка: выберите рискованный вариант, он даст преимущество.";
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
            profile: game.profile,
            player: player
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
            player = data.player || { riskLevel:0, trustSystem:50, stress:0, lastChoices:[], patternCounter:0, fastDecisions:0 };
        }
        if(game.stage >= STAGES.length) game.stage = STAGES.length - 1;
    }

    // ========== ДОПОЛНИТЕЛЬНЫЕ ЭФФЕКТЫ (глитчи, таймеры) ==========
    let scareInterval = null;
    function startRandomScares() {
        if (scareInterval) clearInterval(scareInterval);
        scareInterval = setInterval(() => {
            if (Math.random() < 0.2 && game.stress < 90) {
                const scares = [
                    "⚠️ СИСТЕМА: ТЫ НЕ ОДИН",
                    "💀 Ошибка... или нет?",
                    "👁️ Я вижу, как ты читаешь",
                    "🔊 Твой пульс участился",
                    "🌀 Глитч... реальность искажается"
                ];
                showSystemMessage(scares[Math.floor(Math.random() * scares.length)], true);
                triggerGlitch();
                game.stress = Math.min(100, game.stress + 2);
                updateUI();
            }
        }, 120000);
    }

    function startRandomGlitches() {
        setInterval(() => {
            if (Math.random() < 0.2 && game.stress > 40) {
                document.body.style.filter = 'invert(1)';
                setTimeout(() => document.body.style.filter = '', 200);
                if (Math.random() < 0.5) triggerGlitch();
            }
        }, 30000);
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    function init() {
        loadGame();
        updateUI();
        loadCurrentTask();
        startRandomScares();
        startRandomGlitches();
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
        console.log("Игра разума 4.0 — психологические выборы, ловушки, давление времени.");
    }
    init();
})();