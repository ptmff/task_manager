const express = require('express');
const app = express();
const port = 3000;

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const SECRET_KEY = 'your_secret_key'; // В реальном проекте храните в переменных окружения

app.use(express.json());
app.use(express.static('public'));

// Простая in-memory база пользователей
const users = [];

// Массив задач и генерация id
let tasks = [];
let nextId = 1;

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401); // нет токена — не авторизован
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403); // неправильный токен
    req.user = user;
    next();
  });
}

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: users.length + 1, username, password: hashedPassword };
  users.push(user);
  res.json({ message: 'Пользователь успешно зарегистрирован' });
});

// Логин пользователя
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Неверный пароль' });
  // Генерация JWT-токена (без указания срока действия для простоты)
  const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY);
  res.json({ token });
});

// Защищённые маршруты для работы с задачами:
app.get('/api/tasks', authenticateToken, (req, res) => {
  res.json(tasks);
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, dueDate, reminder } = req.body;
  const task = {
    id: nextId++,
    title,
    status: "Новая", // статус по умолчанию
    dueDate,
    reminder: reminder || null
  };
  tasks.push(task);
  res.json(task);
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex(task => task.id === id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...req.body };
    res.json(tasks[index]);
  } else {
    res.status(404).json({ error: "Задача не найдена" });
  }
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex(task => task.id === id);
  if (index !== -1) {
    const deleted = tasks.splice(index, 1);
    res.json(deleted[0]);
  } else {
    res.status(404).json({ error: "Задача не найдена" });
  }
});

app.listen(port, () => console.log(`Сервер запущен: http://localhost:${port}`));
