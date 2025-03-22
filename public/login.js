document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
  
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  
    const data = await res.json();
    if (res.ok) {
      // Сохраняем токен и перенаправляем на главную страницу задач
      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    } else {
      alert(data.error || 'Ошибка входа');
    }
  });
  