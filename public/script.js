const socket = io();


socket.on('connect', () => {
  const startBalance = parseFloat(document.getElementById('start-balance').value) || 1500000;
  socket.emit('reset', startBalance);
});


const levelSpan = document.getElementById('current-level');
const cardsContainer = document.getElementById('cards-container');
const balanceBody = document.getElementById('balance-body');
const resetBtn = document.getElementById('reset-btn');
const startBalanceInput = document.getElementById('start-balance');
const addBalanceBtn = document.getElementById('add-balance-btn');

const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close-modal');


const completionModal = document.getElementById('completion-modal');
const closeCompletion = document.querySelector('.close-completion');
const finalBalanceSpan = document.getElementById('final-balance');
const completionResetBtn = document.getElementById('completion-reset-btn');

let selectedTaskInProgress = false;
let isAnimating = false;
let pendingState = null;

// Текущий баланс
let currentBalance = 1500000;

// Статистика пула
const poolStatsDiv = document.createElement('div');
poolStatsDiv.className = 'pool-stats';
document.querySelector('.header').appendChild(poolStatsDiv);

socket.on('state', (state) => {
  if (isAnimating) {
    pendingState = state;
  } else {
    updateUI(state);
    updatePoolStats(state.availableTasks);
    currentBalance = state.currentBalance;
  }
});

function updateUI(state) {
  levelSpan.textContent = state.level;
  renderCards(state.currentCards, state.selectedTaskId);
  renderBalance(state.balanceHistory);


  if (state.level === 40 && state.currentCards.length === 0 && !isAnimating) {
    showCompletionModal(state.currentBalance);
  }

  if (state.level >= 40) {
    resetBtn.classList.remove('hidden');
  } else {
    resetBtn.classList.add('hidden');
  }
}

function showCompletionModal(finalBalance) {
  finalBalanceSpan.textContent = finalBalance;
  completionModal.classList.remove('hidden');
}


closeCompletion.addEventListener('click', () => {
  completionModal.classList.add('hidden');
});


completionResetBtn.addEventListener('click', () => {
  const newStartBalance = parseFloat(startBalanceInput.value) || 1500000;
  socket.emit('reset', newStartBalance);
  completionModal.classList.add('hidden');
});

function updatePoolStats(availableTasks) {
  const counts = [0,0,0,0,0,0];
  availableTasks.forEach(t => counts[t.difficulty-1]++);
  poolStatsDiv.innerHTML = `
    <div style="display: flex; gap: 15px; flex-wrap: wrap; background: #16213e; padding: 10px 20px; border-radius: 60px; border: 1px solid #FFD700; margin-bottom: 10px;">
      <span style="color: #FFD700;">Осталось заданий:</span>
      <span>⭐1: ${counts[0]}</span>
      <span>⭐⭐2: ${counts[1]}</span>
      <span>⭐⭐⭐3: ${counts[2]}</span>
      <span>⭐⭐⭐⭐4: ${counts[3]}</span>
      <span>⭐⭐⭐⭐⭐5: ${counts[4]}</span>
      <span>⭐⭐⭐⭐⭐⭐6: ${counts[5]}</span>
    </div>
  `;
}

function renderCards(tasks, selectedId) {
  cardsContainer.innerHTML = '';
  
  if (tasks.length === 1 && selectedId) {
    cardsContainer.classList.add('selected-mode');
    const task = tasks[0];
    const card = document.createElement('div');
    card.className = `card ${task.selected ? 'selected' : ''} ${task.completed ? 'completed' : ''}`;
    card.dataset.id = task.id;

    let stars = '⭐'.repeat(task.difficulty);

    let buttons = '';
    if (task.selected && !task.completed) {
      buttons = `
        <button class="complete-btn" data-id="${task.id}">✅ Выполнено</button>
        <button class="penalty-btn" data-id="${task.id}">⚠️ Штраф</button>
      `;
    } else if (task.completed) {
      buttons = `<button disabled>✔ Выполнено</button>`;
    }

    card.innerHTML = `
      <div class="difficulty">${stars}</div>
      <div class="task-text">${task.description}</div>
      <div class="card-actions">${buttons}</div>
    `;
    cardsContainer.appendChild(card);

    document.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = e.target.dataset.id;
        openCompleteTaskModal(taskId);
      });
    });

    document.querySelectorAll('.penalty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = e.target.dataset.id;
        openPenaltyModal(taskId);
      });
    });

  } else {
    cardsContainer.classList.remove('selected-mode');
    tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = `card ${task.selected ? 'selected' : ''} ${task.completed ? 'completed' : ''}`;
      card.dataset.id = task.id;

      let stars = '⭐'.repeat(task.difficulty);

      let buttons = '';
      if (!task.selected && !task.completed && !selectedId) {
        buttons = `<button class="select-btn" data-id="${task.id}">Выбрать</button>`;
      } else if (task.selected && !task.completed) {
        buttons = `
          <button class="complete-btn" data-id="${task.id}">✅ Выполнено</button>
          <button class="penalty-btn" data-id="${task.id}">⚠️ Штраф</button>
        `;
      } else if (task.completed) {
        buttons = `<button disabled>✔ Выполнено</button>`;
      }

      card.innerHTML = `
        <div class="difficulty">${stars}</div>
        <div class="task-text">${task.description}</div>
        <div class="card-actions">${buttons}</div>
      `;
      cardsContainer.appendChild(card);
    });

    document.querySelectorAll('.select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedId) return;
        const taskId = e.target.dataset.id;

        document.querySelectorAll('.card').forEach(c => {
          if (c.dataset.id !== taskId) {
            c.classList.add('burn');
          } else {
            c.classList.add('selected');
          }
        });

        isAnimating = true;
        socket.emit('selectTask', taskId);

        setTimeout(() => {
          isAnimating = false;
          if (pendingState) {
            updateUI(pendingState);
            updatePoolStats(pendingState.availableTasks);
            pendingState = null;
          }
        }, 500);
      });
    });

    document.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = e.target.dataset.id;
        openCompleteTaskModal(taskId);
      });
    });

    document.querySelectorAll('.penalty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = e.target.dataset.id;
        openPenaltyModal(taskId);
      });
    });
  }
}


function renderBalance(history) {
  balanceBody.innerHTML = '';

  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    const row = document.createElement('tr');
    const changeClass = entry.change > 0 ? 'positive' : (entry.change < 0 ? 'negative' : '');
    row.innerHTML = `
      <td>${entry.time}</td>
      <td>${entry.desc}</td>
      <td class="${changeClass}">${entry.change > 0 ? '+' : ''}${entry.change}</td>
      <td>${entry.balance}</td>
    `;
    balanceBody.appendChild(row);
  }
}

function openCompleteTaskModal(taskId) {
  modalBody.innerHTML = `
    <h2>Текущий баланс: ${currentBalance} ₽</h2>
    <p>Введите новый баланс после выполнения задания:</p>
    <input type="number" id="new-balance" value="${currentBalance}" step="100">
    <button id="submit-complete">Подтвердить</button>
  `;
  modal.classList.remove('hidden');

  document.getElementById('submit-complete').addEventListener('click', () => {
    const newBalance = parseFloat(document.getElementById('new-balance').value);
    if (!isNaN(newBalance)) {
      const change = newBalance - currentBalance;
      socket.emit('completeTask', taskId, change);
    }
    modal.classList.add('hidden');
  }, { once: true });
}

function openPenaltyModal(taskId) {
  modalBody.innerHTML = `
    <h2>Текущий баланс: ${currentBalance} ₽</h2>
    <p>Введите новый баланс после неудачной попытки (штраф):</p>
    <input type="number" id="new-balance" value="${currentBalance}" step="100">
    <button id="submit-penalty">Подтвердить штраф</button>
  `;
  modal.classList.remove('hidden');

  document.getElementById('submit-penalty').addEventListener('click', () => {
    const newBalance = parseFloat(document.getElementById('new-balance').value);
    if (!isNaN(newBalance)) {
      socket.emit('penaltyWithBalance', taskId, newBalance);
    }
    modal.classList.add('hidden');
  }, { once: true });
}

function openAddBalanceModal() {
  modalBody.innerHTML = `
    <h2>Добавить запись в баланс</h2>
    <p>Текущий баланс: ${currentBalance} ₽</p>
    <input type="text" id="balance-desc" placeholder="Описание">
    <input type="number" id="balance-amount" placeholder="Сумма изменения">
    <button id="submit-balance">Добавить</button>
  `;
  modal.classList.remove('hidden');

  document.getElementById('submit-balance').addEventListener('click', () => {
    const desc = document.getElementById('balance-desc').value;
    const amount = parseFloat(document.getElementById('balance-amount').value) || 0;
    if (desc) {
      socket.emit('addBalance', desc, amount);
    }
    modal.classList.add('hidden');
  }, { once: true });
}

function openPrizeModal() {
  modalBody.innerHTML = `
    <h2>🎁 Обычный розыгрыш</h2>
    <p>Текущий баланс: ${currentBalance} ₽</p>
    <p>Сумма приза (3 000 – 10 000 ₽):</p>
    <input type="number" id="prize-amount" value="3000" step="100">
    <p>Количество победителей (1-5):</p>
    <input type="number" id="prize-winners" value="1" min="1" max="5">
    <p>Введите имена через запятую:</p>
    <textarea id="prize-names" placeholder="user1, user2, user3"></textarea>
    <button id="submit-prize">Раздать</button>
  `;
  modal.classList.remove('hidden');

  document.getElementById('submit-prize').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('prize-amount').value);
    const winnersCount = parseInt(document.getElementById('prize-winners').value);
    const namesStr = document.getElementById('prize-names').value;
    const names = namesStr.split(',').map(s => s.trim()).filter(s => s);
    if (amount && winnersCount && names.length >= winnersCount) {
      const shuffled = names.sort(() => 0.5 - Math.random());
      const winners = shuffled.slice(0, winnersCount);
      socket.emit('prizeDraw', { amount, winners });
      alert(`Победители: ${winners.join(', ')}`);
    } else {
      alert('Недостаточно имён или неверные данные');
    }
    modal.classList.add('hidden');
  }, { once: true });
}


addBalanceBtn.addEventListener('click', openAddBalanceModal);

resetBtn.addEventListener('click', () => {
  if (confirm('Завершить квест и начать заново?')) {
    const newStartBalance = parseFloat(startBalanceInput.value) || 1500000;
    socket.emit('reset', newStartBalance);
  }
});


document.getElementById('apply-start-balance').addEventListener('click', () => {
  const newBalance = parseFloat(startBalanceInput.value);
  if (!isNaN(newBalance) && newBalance !== currentBalance) {
    const change = newBalance - currentBalance;
    socket.emit('addBalance', 'Установка начального баланса', change);
  } else if (newBalance === currentBalance) {
    alert('Баланс уже равен этому значению');
  } else {
    alert('Введите корректное число');
  }
});


document.querySelector('.level-title').addEventListener('dblclick', () => {
  openPrizeModal();
});

closeModal.addEventListener('click', () => {
  modal.classList.add('hidden');
});


window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
  if (e.target === completionModal) {
    completionModal.classList.add('hidden');
  }
});


(function addBurnAnimation() {
  const style = document.createElement('style');
  style.textContent = `
    .card.burn {
      animation: burn 0.5s forwards;
      pointer-events: none;
    }
    @keyframes burn {
      0% { opacity: 1; transform: scale(1); filter: brightness(1); }
      100% { opacity: 0; transform: scale(0) rotate(10deg); filter: brightness(2); }
    }
  `;
  document.head.appendChild(style);
})();