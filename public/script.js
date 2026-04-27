(function(){
    console.log("Игра запущена");
    // ----- ЭТАПЫ -----
    const STAGES = [
        { name: "НАБЛЮДЕНИЕ", icon: "fa-eye", missions: 5, stressInc: 2, trustShift: 2, lieChance: 10 },
        { name: "СОМНЕНИЕ",    icon: "fa-question", missions: 7, stressInc: 5, trustShift: 0, lieChance: 25 },
        { name: "ДАВЛЕНИЕ",    icon: "fa-weight-hanging", missions: 8, stressInc: 10, trustShift: -5, lieChance: 40 },
        { name: "ЛОМКА",       icon: "fa-skull", missions: 7, stressInc: 18, trustShift: -12, lieChance: 60 },
        { name: "ФИНАЛ",       icon: "fa-crown", missions: 3, stressInc: 25, trustShift: -20, lieChance: 80 }
    ];

    // ----- ФРАЗЫ (50+) -----
    const PHRASES = {
        0: ["Система: калибровка началась.","Система: ошибки допустимы. Пока.","Система: пока всё предсказуемо.","Система: ты не первый.","Система: продолжай."],
        1: ["Система: ты начинаешь сомневаться.","Система: правильный ответ не всегда выгодный.","Система: ты ищешь закономерность… её нет.","Система: интересный паттерн поведения.","Система: ты ускорился — значит нервничаешь."],
        2: ["Система: ты начал играть, а не думать.","Система: теперь будет сложнее.","Система: ты пропустил очевидное.","Система: ты реагируешь, а не выбираешь.","Система: я начинаю управлять процессом."],
        3: ["Система: правила больше не фиксированы.","Система: правильность не имеет значения.","Система: ты потерял контроль.","Система: ты играешь по моим правилам.","Система: это забавно."],
        4: ["Система: ты дошёл до конца.","Система: ты не победил, ты просто дошёл.","Система: ты пытался быть умнее.","Система: ты предсказуем.","Система: финальный выбор определит всё."]
    };

    const SLOTS = ["Sweet Bonanza", "Gates of Olympus", "The Dog House", "Wanted Dead or a Wild", "Starburst", "Book of Dead"];

    // ----- СОСТОЯНИЕ -----
    let game = {
        stage: 0,
        missionIdx: 0,
        completedMissions: [],
        stress: 0,
        trust: 50,
        profile: { risky: 0, safe: 0, mistakes: 0, speed: 0, lastAnswerTime: Date.now() }
    };
    let currentTask = null;

    // ----- DOM---------
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

    // ----- ВСПОМОГАТЕЛЬНЫЕ -----
    function getSystemLine() {
        let arr = PHRASES[game.stage] || PHRASES[0];
        return arr[Math.floor(Math.random() * arr.length)];
    }
    function updateUI() {
        let s = STAGES[game.stage];
        let done = game.completedMissions.filter(m => m.stage === game.stage).length;
        let percent = (done / s.missions) * 100;
        els.phaseFill.style.width = percent + '%';
        els.stressFill.style.width = Math.min(100, game.stress) + '%';
        els.stressValue.innerText = game.stress;
        els.trustFill.style.width = game.trust + '%';
        els.trustValue.innerText = game.trust;
        els.phaseNum.innerText = game.stage+1;
        els.phaseNameBadge.innerText = `${s.name} (${game.stage+1}/5)`;
        els.riskStat.innerText = game.profile.risky;
        els.safeStat.innerText = game.profile.safe;
        els.mistakeStat.innerText = game.profile.mistakes;
        renderStageMap();
        if(game.stress > 70) triggerGlitch();
    }
    function renderStageMap() {
        els.phaseList.innerHTML = '';
        STAGES.forEach((s, i) => {
            let done = game.completedMissions.filter(m => m.stage === i).length;
            let div = document.createElement('div');
            div.className = `phase-item ${i===game.stage ? 'active' : ''}`;
            div.innerHTML = `<div class="phase-icon"><i class="fas ${s.icon}"></i></div><div>${s.name}</div><div style="margin-left:auto;">${done}/${s.missions}</div>`;
            div.addEventListener('click', () => switchStage(i));
            els.phaseList.appendChild(div);
        });
    }
    function switchStage(idx) {
        if(idx === game.stage) return;
        if(idx > game.stage) { showSystemMessage("❌ Этап заблокирован"); return; }
        game.stage = idx;
        let completedIds = game.completedMissions.filter(m => m.stage === idx).map(m => m.missionId);
        let first = 0;
        while(completedIds.includes(first) && first < STAGES[idx].missions) first++;
        game.missionIdx = first;
        saveGame();
        updateUI();
        loadCurrentTask();
        showSystemMessage(getSystemLine());
    }
    function showSystemMessage(msg) {
        els.systemComment.innerHTML = `<i class="fas fa-robot"></i> ${msg}`;
        setTimeout(() => {
            if(els.systemComment.innerHTML.includes(msg))
                els.systemComment.innerHTML = `<i class="fas fa-robot"></i> ${getSystemLine()}`;
        }, 4000);
    }
    function triggerGlitch() {
        document.body.classList.add('glitch');
        setTimeout(() => document.body.classList.remove('glitch'), 200);
    }
    function shouldLie() {
        let base = STAGES[game.stage].lieChance;
        if(game.profile.risky > game.profile.safe+2) base += 15;
        if(game.profile.mistakes > 3) base -= 10;
        if(game.trust < 30) base += 20;
        return Math.random()*100 < base;
    }
    function generateTask(lied) {
        let slot = SLOTS[Math.floor(Math.random()*SLOTS.length)];
        let spins = [50,100,150][Math.floor(Math.random()*3)];
        let task = `🎰 ${slot}: ${spins} спинов`;
        if(lied) task = task + " (условие изменено системой)";
        if(game.stage === 3 && Math.random()<0.5) task = "🌀 Сделай 100 спинов, но остановись если выигрыш >50$ 🌀";
        return task;
    }
    function loadCurrentTask() {
        let s = STAGES[game.stage];
        if(game.missionIdx >= s.missions) {
            if(game.stage+1 < STAGES.length) {
                game.stage++;
                game.missionIdx = 0;
                saveGame();
                updateUI();
                loadCurrentTask();
                showSystemMessage(`✅ ЭТАП ПРОЙДЕН. ЗАГРУЖАЮ ${STAGES[game.stage].name}`);
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
        let lied = shouldLie();
        let text = generateTask(lied);
        currentTask = { text, type:"action", completed:false, lied };
        els.questText.innerText = text;
        els.dynamicZone.innerHTML = `<p><i class="fas fa-dice-d6"></i> Выполните действие в казино и нажмите "ВЫПОЛНИТЬ"</p>`;
        if(game.stage === 3) els.dynamicZone.innerHTML += `<small>⚠️ Правило может измениться</small>`;
        showSystemMessage(getSystemLine());
    }
    function completeTask() {
        if(!currentTask || currentTask.completed) return;
        // анализ поведения: считаем нажатие "Выполнить" как риск
        game.profile.risky++;
        game.profile.lastAnswerTime = Date.now();
        let stressDelta = STAGES[game.stage].stressInc;
        let trustDelta = STAGES[game.stage].trustShift;
        if(currentTask.lied) {
            stressDelta += 5;
            trustDelta -= 8;
            showSystemMessage("⚠️ СИСТЕМА ОБМАНУЛА. Задание было сложнее.");
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
        els.completeBtn.disabled = true;
        setTimeout(() => {
            loadCurrentTask();
            els.completeBtn.disabled = false;
            els.nextBtn.disabled = false;
        }, 1200);
    }
    function finishGame() {
        let verdict = "";
        if(game.profile.risky > game.profile.safe+3) verdict = "Ты постоянно рисковал. Система предсказала каждый шаг.";
        else if(game.profile.mistakes > 5) verdict = "Ты делал много ошибок. Система использовала их против тебя.";
        else verdict = "Ты пытался быть умным, но просто реагировал. Предсказуемо.";
        document.getElementById('finalVerdict').innerText = verdict;
        document.getElementById('finalModal').classList.remove('hidden');
        document.getElementById('safeFinal').onclick = () => {
            document.getElementById('finalModal').classList.add('hidden');
            showInfo("ФИНАЛ", "Вы выбрали безопасность.");
        };
        document.getElementById('riskFinal').onclick = () => {
            document.getElementById('finalModal').classList.add('hidden');
            let success = Math.random() < 0.4;
            if(success) showInfo("ПОБЕДА", "Система дала сбой. Вы доказали, что человек умнее.");
            else showInfo("ПОРАЖЕНИЕ", "Система смеётся.");
        };
    }
    function showInfo(title, msg) {
        document.getElementById('infoTitle').innerText = title;
        document.getElementById('infoMsg').innerText = msg;
        document.getElementById('infoModal').classList.remove('hidden');
    }
    function showHint() {
        let isTruth = Math.random() < 0.5;
        let hintMsg = isTruth ? "Подсказка: выполняйте задания быстро, система замедляет реакцию." : "Ложная подсказка: не выполняйте следующее задание, это ловушка.";
        document.getElementById('hintMsg').innerHTML = hintMsg + "<br><small>(система может обманывать)</small>";
        document.getElementById('hintModal').classList.remove('hidden');
        game.profile.safe++;
        game.trust = Math.max(0, game.trust-2);
        updateUI();
        saveGame();
    }
    function resetGame() {
        if(confirm("Сбросить весь прогресс?")) {
            localStorage.removeItem('mindGameFinal');
            location.reload();
        }
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
    }

    // ----- ИНИЦИАЛИЗАЦИЯ -----
    loadGame();
    updateUI();
    loadCurrentTask();

    // ----- ОБРАБОТЧИКИ -----
    els.completeBtn.addEventListener('click', completeTask);
    els.nextBtn.addEventListener('click', () => loadCurrentTask());
    els.resetBtn.addEventListener('click', resetGame);
    els.hintBtn.addEventListener('click', showHint);
    document.getElementById('closeHint')?.addEventListener('click', () => document.getElementById('hintModal').classList.add('hidden'));
    document.getElementById('closeInfo')?.addEventListener('click', () => document.getElementById('infoModal').classList.add('hidden'));
    console.log("Игра готова");
})();