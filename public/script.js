function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } : { 'Content-Type': 'application/json' };
  }
  

// Функция для воспроизведения звука уведомления с использованием Web Audio API
function playSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, context.currentTime); // нота A4
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();

        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 10);
        oscillator.stop(context.currentTime + 10);
    } catch (e) {
        console.error("Ошибка при воспроизведении звука:", e);
    }
}

// Функция для создания уведомления, которое остаётся до закрытия пользователем
function showNotification(message) {
    const notif = document.createElement("div");
    notif.textContent = message;
    notif.style.position = "fixed";
    notif.style.top = "20px";
    notif.style.right = "20px";
    notif.style.backgroundColor = "#f44336";
    notif.style.color = "#fff";
    notif.style.padding = "15px 25px";
    notif.style.borderRadius = "5px";
    notif.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
    notif.style.zIndex = "1000";
    notif.style.fontSize = "16px";
    notif.style.fontWeight = "bold";
    notif.style.display = "flex";
    notif.style.alignItems = "center";
    notif.style.gap = "10px";

    const closeButton = document.createElement("button");
    closeButton.textContent = "Закрыть";
    closeButton.style.padding = "5px 10px";
    closeButton.style.cursor = "pointer";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "3px";
    closeButton.style.backgroundColor = "#fff";
    closeButton.style.color = "#f44336";
    closeButton.style.fontWeight = "bold";

    closeButton.onclick = () => {
        notif.remove();
    };

    notif.appendChild(closeButton);
    document.body.appendChild(notif);
    playSound();
}

// Набор для хранения ID задач, для которых уже показано уведомление
const notifiedTasks = new Set();


// Функция для проверки напоминаний
function checkReminders(tasks) {
    tasks.forEach(task => {
        // Не показываем уведомление, если задача завершена или уведомление уже показывалось
        if (task.reminder && task.status !== "Завершена" && !notifiedTasks.has(task.id)) {
            const reminderDate = new Date(task.reminder);
            const now = new Date();
            // Если время напоминания прошло, показываем уведомление
            if (reminderDate <= now) {
                showNotification(`Напоминание для задачи: "${task.title}"`);
                notifiedTasks.add(task.id);
            }
        }
    });
}


// Функция для создания элемента задачи
function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'task';
    let innerHTML = `
      <h3>${task.title} (Статус: ${task.status})</h3>
      <p>Срок выполнения: ${new Date(task.dueDate).toLocaleString()}</p>
      <p>Напоминание: ${task.reminder ? new Date(task.reminder).toLocaleString() : 'нет'}</p>
      <div class="button-group">
        <button class="delete-button" onclick="deleteTask(${task.id})">Удалить</button>
        <button class="edit-button" onclick="editTask(${task.id})">Редактировать название</button>
    `;
    
    if (task.status === "Новая") {
      innerHTML += `<button class="start-button" onclick="updateTaskStatus(${task.id}, 'В процессе')">Начать</button>`;
    }
    if (task.status === "В процессе") {
      innerHTML += `<button class="finish-button" onclick="updateTaskStatus(${task.id}, 'Завершена')">Завершить</button>`;
    }
    
    innerHTML += `</div>`;
    div.innerHTML = innerHTML;
    return div;
  }
  

// Функция для получения и отображения задач в столбцах
async function fetchTasks() {
    const res = await fetch('/api/tasks', {
        headers: getAuthHeaders()
      });
    const tasks = await res.json();

    // Очищаем содержимое каждого столбца
    document.getElementById('newTasks').innerHTML = '';
    document.getElementById('inProcessTasks').innerHTML = '';
    document.getElementById('completedTasks').innerHTML = '';

    tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        if (task.status === "Новая") {
            document.getElementById('newTasks').appendChild(taskElement);
        } else if (task.status === "В процессе") {
            document.getElementById('inProcessTasks').appendChild(taskElement);
        } else if (task.status === "Завершена") {
            document.getElementById('completedTasks').appendChild(taskElement);
        }
    });

    checkReminders(tasks);
}

// Обработка отправки формы для добавления задачи
document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const dueDate = document.getElementById('dueDate').value;
    const reminder = document.getElementById('reminder').value;

    const task = { title, dueDate, reminder: reminder || null };

    await fetch('/api/tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(task)
    });

    document.getElementById('taskForm').reset();
    fetchTasks();
});

// Удаление задачи
async function deleteTask(id) {
    await fetch('/api/tasks/' + id, { method: 'DELETE', headers: getAuthHeaders() });
    notifiedTasks.delete(id);
    fetchTasks();
}

// Редактирование задачи (изменение названия)
async function editTask(id) {
    const newTitle = prompt("Введите новое название задачи:");
    if (newTitle) {
        await fetch('/api/tasks/' + id, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title: newTitle })
        });
        fetchTasks();
    }
}

// Обновление статуса задачи и показ уведомления
async function updateTaskStatus(id, newStatus) {
    await fetch('/api/tasks/' + id, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
    });
    fetchTasks();
}

// Первоначальная загрузка задач
fetchTasks();

// Периодическая проверка напоминаний каждые 10 секунд
setInterval(fetchTasks, 10000);

if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
  }
  