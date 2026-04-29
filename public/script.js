(function(){
    // ========== ЭТАПЫ ИГРЫ ==========
    const STAGES = [
        { name: "ДОВЕРИЕ", icon: "fa-hand-peace", missions: 5, stressInc: 2, trustShift: 2, lieChance: 10 },
        { name: "СОМНЕНИЕ", icon: "fa-question", missions: 7, stressInc: 5, trustShift: 0, lieChance: 25 },
        { name: "ДАВЛЕНИЕ", icon: "fa-weight-hanging", missions: 8, stressInc: 10, trustShift: -5, lieChance: 40 },
        { name: "ЛОМКА", icon: "fa-skull", missions: 7, stressInc: 18, trustShift: -12, lieChance: 60 },
        { name: "ФИНАЛ", icon: "fa-crown", missions: 3, stressInc: 25, trustShift: -20, lieChance: 80 }
    ];

    // ========== ФРАЗЫ (расширенные) ==========
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

    // ========== БАНК ЗАДАНИЙ ПО ФАЗАМ (с выбором, риском, абсурдом) ==========
    const TASKS_BY_STAGE = {
        0: [ // ДОВЕРИЕ
            "🎰 Сделай 50 спинов в любом слоте",
            "🎰 Сделай 70 спинов в новом слоте",
            "🎰 Сделай 50 спинов ИЛИ 30 спинов с x2 ставкой",
            "🎰 Выбери слот: старый или новый — 60 спинов",
            "🎰 Сделай 50 спинов, чат выбирает слот"
        ],
        1: [ // СОМНЕНИЕ
            "🎰 Сделай 100 спинов… или остановись сейчас",
            "🎰 Сделай 50 спинов, но увеличь ставку через каждые 10",
            "🎰 Играй до первого бонуса",
            "🎰 80 спинов, но нельзя менять слот",
            "🎰 Чат выбирает: 120 спинов или 60 с x2 ставкой"
        ],
        2: [ // ДАВЛЕНИЕ
            "🎰 Играй пока не выиграешь x50",
            "🎰 Сделай 100 спинов. Если нет бонуса → +50",
            "🎰 50 спинов, но если проигрыш 3 раза подряд → +30",
            "🎰 Сделай 70 спинов. Если будет бонус — удвой задание",
            "🎰 Чат выбирает слот и ставку",
            "🎰 Сделай 100 спинов ИЛИ 40 спинов с x3 ставкой"
        ],
        3: [ // ЛОМКА
            "🎰 Сделай 50 спинов. Не делай 50 спинов.",
            "🎰 Играй до бонуса. Если будет бонус — это ошибка.",
            "🎰 Остановись сейчас… или продолжай и потеряй больше",
            "🎰 Сделай 100 спинов. Или не делай. Решение уже принято.",
            "🎰 Играй пока не проиграешь… или не выиграешь",
            "🎰 Чат решает, но система может изменить выбор"
        ],
        4: [ // ФИНАЛ
            "🎰 Забери результат или удвой и продолжай",
            "🎰 Последний шанс: 50 спинов x5 ставка ИЛИ выход"
        ]
    };

    // Дополнительные (рандомные)
    const EXTRA_TASKS = [
        "🎰 Если сейчас выигрыш → повтори задание",
        "🎰 Если сейчас проигрыш → добавь 20 спинов",
        "🎰 Сделай 30 спинов. Если будет бонус → +100",
        "🎰 Играй 50 спинов. Чат решает, остановиться или нет",
        "🎰 Сделай 100 спинов. Каждый проигрыш → +1 спин",
        "🎰 Сделай 60 спинов. Каждый выигрыш → +10 спинов"
    ];

    // Задания, требующие подсказки системы (с возможной ложью)
    const HINT_TASKS = [
        { text: "🎲 Система подскажет число от 1 до 3. Какое выпадет? (подсказка может врать)", hint: "система говорит: 2", correct: "2", liePossible: true },
        { text: "🔮 Система утверждает, что следующий бонус будет в Gates of Olympus. Верить?", hint: "ставь на Olympus", correct: "да", liePossible: true },
        { text: "❓ Система: 'Выбери слот, который принесёт выигрыш'. Подсказка: 'Sweet Bonanza'", hint: "Sweet Bonanza", correct: "Sweet Bonanza", liePossible: true },
        { text: "⚠️ Система: 'Если сейчас сделаешь 50 спинов, будет бонус'. Подсказка: 'Не рискуй'", hint: "не рискуй", correct: "рискнуть", liePossible: true }
    ];

    // ========== ПУГАЮЩИЕ И СБИВАЮЩИЕ ЭЛЕМЕНТЫ ==========
    let scareInterval = null;
    let fakeTimerInterval = null;
    let glitchColorInterval = null;

    function randomScare() {
        const scares = [
            "⚠️ СИСТЕМА: ТЫ НЕ ОДИН",
            "💀 Ошибка... или нет?",
            "👁️ Я вижу, как ты читаешь",
            "🔊 Система: твой пульс участился",
            "🌀 Глитч... реальность искажается",
            "❓ Система: ты потерял 10 секунд жизни, пока читал это"
        ];
        const msg = scares[Math.floor(Math.random() * scares.length)];
        showSystemMessage(msg, true);
        triggerGlitch();
        game.stress = Math.min(100, game.stress + 2);
        updateUI();
    }

    function startRandomScares() {
        if (scareInterval) clearInterval(scareInterval);
        scareInterval = setInterval(() => {
            if (Math.random() < 0.25 && game.stress < 90) randomScare();
            if (game.stress > 70 && Math.random() < 0.4) randomScare();
        }, 120000);
    }

    function startFakeTimer() {
        if (fakeTimerInterval) return;
        let timeLeft = 30;
        const fakeDiv = document.createElement('div');
        fakeDiv.id = 'fakeTimer';
        fakeDiv.style.position = 'fixed';
        fakeDiv.style.bottom = '20px';
        fakeDiv.style.left = '20px';
        fakeDiv.style.background = '#ff3366';
        fakeDiv.style.color = 'white';
        fakeDiv.style.padding = '8px 16px';
        fakeDiv.style.borderRadius = '30px';
        fakeDiv.style.fontFamily = 'monospace';
        fakeDiv.style.zIndex = '9999';
        fakeDiv.style.fontWeight = 'bold';
        fakeDiv.innerText = `⏱️ СИСТЕМНЫЙ СБРОС: ${timeLeft}`;
        document.body.appendChild(fakeDiv);
        fakeTimerInterval = setInterval(() => {
            timeLeft--;
            fakeDiv.innerText = `⏱️ СИСТЕМНЫЙ СБРОС: ${timeLeft}`;
            if (timeLeft <= 0) {
                clearInterval(fakeTimerInterval);
                fakeDiv.remove();
                showSystemMessage("❓ Система: таймер обнулён. Ничего не произошло. Или произошло?", true);
                triggerGlitch();
                fakeTimerInterval = null;
            }
        }, 1000);
    }

    function glitchColorInversion() {
        document.body.style.filter = 'invert(1)';
        setTimeout(() => { document.body.style.filter = ''; }, 200);
    }

    function startRandomGlitches() {
        setInterval(() => {
            if (Math.random() < 0.2 && game.stress > 50) {
                glitchColorInversion();
                if (Math.random() < 0.5) triggerGlitch();
            }
        }, 30000);
    }

    // ========== ОСТАЛЬНЫЕ ВСПОМОГАТЕЛЬНЫЕ ==========
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

    // ========== ГЕНЕРАЦИЯ ЗАДАНИЯ (с учётом подсказок) ==========
    function generateTaskForStage(stageIdx, lied = false) {
        // 30% шанс на задание с подсказкой
        if (Math.random() < 0.3 && HINT_TASKS.length) {
            let hintTask = { ...HINT_TASKS[Math.floor(Math.random() * HINT_TASKS.length)] };
            hintTask.requiresHint = true;
            if (lied && hintTask.liePossible) {
                // ложь: подсказка становится "правильным" ответом, но это обман
                hintTask.correctLie = hintTask.correct;
                hintTask.correct = hintTask.hint;
                hintTask.text = "[СИСТЕМА ВРЁТ] " + hintTask.text;
            }
            return hintTask;
        }
        let pool = TASKS_BY_STAGE[stageIdx] || TASKS_BY_STAGE[0];
        let taskText = pool[Math.floor(Math.random() * pool.length)];
        if (Math.random() < 0.3) {
            const extra = EXTRA_TASKS[Math.floor(Math.random() * EXTRA_TASKS.length)];
            taskText = extra + " // " + taskText;
        }
        if (lied) {
            taskText = "[ЛОЖЬ] " + taskText + " (система изменила правило)";
        }
        return { text: taskText, type: "action", requiresHint: false };
    }

    // ========== СОСТОЯНИЕ ИГРЫ ==========
    let game = {
        stage: 0,
        missionIdx: 0,
        completedMissions: [],
        stress: 0,
        trust: 50,
        profile: {
            risky: 0,
            safe: 0,
            mistakes: 0,
            speed: 0,
            hintsUsed: 0,
            lastAnswerTime: Date.now()
        }
    };
    let currentTask = null;

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

    // ========== UI И ПРОГРЕСС ==========
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

    // ========== ОСНОВНАЯ ЛОГИКА ЗАДАНИЙ ==========
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
        const taskObj = generateTaskForStage(game.stage, lied);
        currentTask = {
            text: taskObj.text,
            type: taskObj.requiresHint ? "hint_quiz" : "action",
            completed: false,
            lied: lied,
            requiresHint: taskObj.requiresHint || false,
            correctAnswer: taskObj.correct || null,
            hint: taskObj.hint || null
        };
        els.questText.innerText = currentTask.text;
        els.dynamicZone.innerHTML = "";
        if (currentTask.type === "hint_quiz") {
            const input = document.createElement('input');
            input.type = "text";
            input.placeholder = "Введите ответ...";
            input.id = "quizAnswer";
            const hintButton = document.createElement('button');
            hintButton.innerText = "💡 ВЗЯТЬ ПОДСКАЗКУ СИСТЕМЫ";
            hintButton.style.marginTop = "10px";
            hintButton.style.background = "#0f0";
            hintButton.style.border = "none";
            hintButton.style.padding = "8px 16px";
            hintButton.style.borderRadius = "40px";
            hintButton.style.cursor = "pointer";
            hintButton.onclick = () => {
                if (currentTask.hint) {
                    showSystemMessage(`Подсказка системы: ${currentTask.hint}`, false);
                    if (currentTask.lied) showSystemMessage("⚠️ (но система может обманывать)", true);
                } else {
                    showSystemMessage("❓ Система молчит... или нет ответа?", true);
                }
                game.profile.hintsUsed++;
                saveGame();
            };
            els.dynamicZone.appendChild(input);
            els.dynamicZone.appendChild(hintButton);
        } else {
            els.dynamicZone.innerHTML = `<p><i class="fas fa-dice-d6"></i> Выполните действие в казино и нажмите «ВЫПОЛНИТЬ»</p>`;
        }
        if(game.stage === 3) {
            const chaosMsg = document.createElement('small');
            chaosMsg.innerText = "⚠️ Правило может измениться в любой момент.";
            els.dynamicZone.appendChild(chaosMsg);
        }
        showSystemMessage(getSystemLine());

        // Сбивающий этап: иногда прогресс-бар дёргается
        if (Math.random() < 0.2 && game.stress > 30) {
            const fakePercent = Math.min(100, (game.completedMissions.filter(m => m.stage === game.stage).length + 1) / STAGES[game.stage].missions * 100);
            els.phaseFill.style.width = fakePercent + '%';
            setTimeout(() => updateUI(), 800);
        }
        // Фальшивый таймер (15% шанс)
        if (Math.random() < 0.15 && !fakeTimerInterval) {
            startFakeTimer();
        }
    }

    function completeTask() {
        if(!currentTask || currentTask.completed) { showSystemMessage("Задание уже выполнено."); return; }
        let isCorrect = true;
        if (currentTask.type === "hint_quiz") {
            const input = document.getElementById('quizAnswer');
            if (!input) { showSystemMessage("Ошибка ввода"); return; }
            const answer = input.value.trim().toLowerCase();
            const correct = currentTask.correctAnswer ? currentTask.correctAnswer.toLowerCase() : null;
            if (!correct || answer !== correct) {
                isCorrect = false;
                game.profile.mistakes++;
                showSystemMessage(`❌ Неправильно. Правильный ответ: ${currentTask.correctAnswer}`, true);
                triggerGlitch();
                game.stress = Math.min(100, game.stress + 10);
                game.trust = Math.max(0, game.trust - 5);
                updateUI();
                saveGame();
                return;
            } else {
                showSystemMessage("✅ Верно! Система засчитывает.");
            }
        } else {
            updateProfile("risk", true);
        }
        let stressDelta = STAGES[game.stage].stressInc;
        let trustDelta = STAGES[game.stage].trustShift;
        if(currentTask.lied) {
            stressDelta += 5;
            trustDelta -= 8;
            showSystemMessage("⚠️ СИСТЕМА ОБМАНУЛА. Задание было сложнее.", true);
            triggerGlitch();
        } else {
            if (currentTask.type !== "hint_quiz") showSystemMessage("✅ Задание засчитано.");
        }
        game.stress = Math.min(100, game.stress + stressDelta);
        game.trust = Math.min(100, Math.max(0, game.trust + trustDelta));
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
        }, 1200);
    }

    // ========== ФИНАЛ ==========
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
        if(isTruth) hintMsg = "Подсказка: выполняйте задания быстро, система замедляет реакцию при паузах.";
        else hintMsg = "Ложная подсказка: не выполняйте следующее задание, это ловушка.";
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
            game.profile = data.profile || { risky:0, safe:0, mistakes:0, speed:0, hintsUsed:0, lastAnswerTime:Date.now() };
        }
        if(game.stage >= STAGES.length) game.stage = STAGES.length - 1;
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
        console.log("Игра разума 3.0 — с пугающими элементами, ложными подсказками и таймером-пустышкой");
    }
    init();
})();