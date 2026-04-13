class TodoApp {
  constructor() {
    this.token = localStorage.getItem('token');
    this.username = localStorage.getItem('username');
    this.tasks = [];
    this.editingId = null;
    this.init();
  }

  init() {
    if (this.isAuthPage()) {
      if (this.token) window.location.href = '/';
    } else {
      if (!this.token) {
        window.location.href = '/login.html';
        return;
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      this.usernameEl = document.getElementById('username');
      if (this.usernameEl) this.usernameEl.textContent = this.username;

      this.bindEvents();
      
      if (!this.isAuthPage() && this.token) {
        this.loadTasks();
      }
    });
  }

  isAuthPage() {
    return window.location.pathname.includes('login') || window.location.pathname.includes('register');
  }

  bindEvents() {
    // РЕГИСТРАЦИЯ + ЛОГИН
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm'); //  ДОБАВЛЕНО
    
    if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    if (registerForm) registerForm.addEventListener('submit', (e) => this.handleRegister(e)); //  ДОБАВЛЕНО

    // App buttons
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
    document.getElementById('addTaskBtn')?.addEventListener('click', () => this.addTask());
    document.getElementById('newTaskInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTask();
    });

    document.getElementById('saveEditBtn')?.addEventListener('click', () => this.saveEdit());
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => this.closeModal());

    document.getElementById('editModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'editModal') this.closeModal();
    });

    document.getElementById('tasksList')?.addEventListener('click', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;

      const taskId = parseInt(taskItem.dataset.id);

      if (e.target.classList.contains('task-checkbox') || e.target.closest('.task-checkbox')) {
        this.toggleTask(taskId);
        return;
      }

      if (e.target.classList.contains('btn-edit')) {
        this.editTask(taskId);
        return;
      }

      if (e.target.classList.contains('btn-delete')) {
        this.deleteTask(taskId);
        return;
      }
    });
  }


  async apiCall(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      ...options
    };

    try {
      const response = await fetch(`/api${endpoint}`, config);
      
      if (response.status === 204 || (response.status === 200 && response.headers.get('content-length') === '0')) {
        return { success: true };
      }
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  //  ЛОГИН
  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.querySelector('.error-message') || document.getElementById('loginError');

    try {
      if (errorEl) errorEl.textContent = '';
      const { token, user } = await this.apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('token', token);
      localStorage.setItem('username', user.username);
      window.location.href = '/';
    } catch (error) {
      if (errorEl) errorEl.textContent = error.message;
    }
  }

  //  РЕГИСТРАЦИЯ
  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername')?.value || document.getElementById('registerUsername')?.value;
    const password = document.getElementById('regPassword')?.value || document.getElementById('registerPassword')?.value;
    const errorEl = document.getElementById('registerError') || document.querySelector('.register-error');

    try {
      if (errorEl) errorEl.textContent = '';
      const { token, user } = await this.apiCall('/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('token', token);
      localStorage.setItem('username', user.username);
      window.location.href = '/';
    } catch (error) {
      if (errorEl) errorEl.textContent = error.message;
    }
  }

  async loadTasks() {
    try {
      const tasks = await this.apiCall('/tasks');
      this.tasks = tasks || [];
      this.render();
    } catch (error) {
      console.error('Load tasks failed:', error);
      if (error.message.includes('token') || error.message.includes('401')) {
        this.logout();
      }
    }
  }

  render() {
    const tasksList = document.getElementById('tasksList');
    const emptyState = document.getElementById('emptyState');
    const totalEl = document.getElementById('totalTasks');
    const completedEl = document.getElementById('completedTasks');

    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    if (totalEl) totalEl.textContent = total;
    if (completedEl) completedEl.textContent = completed;

    if (total === 0) {
      if (tasksList) tasksList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (tasksList) {
      tasksList.innerHTML = this.tasks.map(task => `
        <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
          <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
          <div class="task-content ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.title || task.text)}</div>
          <div class="task-actions">
            <button class="btn-edit">✏️</button>
            <button class="btn-delete">🗑️</button>
          </div>
        </li>
      `).join('');
    }
  }

  async addTask() {
    const input = document.getElementById('newTaskInput');
    if (!input) return;

    const title = input.value.trim();
    if (!title) return;

    try {
      await this.apiCall('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title })
      });
      input.value = '';
      await this.loadTasks();
    } catch (error) {
      alert('Ошибка создания: ' + error.message);
    }
  }

  async toggleTask(id) {
    const task = this.tasks.find(t => t.id == id);
    if (!task) return;

    try {
      await this.apiCall(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed: !task.completed })
      });
      await this.loadTasks();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  }

  editTask(id) {
    const task = this.tasks.find(t => t.id == id);
    if (!task) return;

    this.editingId = id;
    document.getElementById('editTaskInput').value = task.title || task.text;
    document.getElementById('editModal').classList.add('active');
  }

  async saveEdit() {
    if (!this.editingId) return;

    const input = document.getElementById('editTaskInput');
    const newTitle = input.value.trim();
    if (!newTitle) return;

    try {
      await this.apiCall(`/tasks/${this.editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle })
      });
      await this.loadTasks();
      this.closeModal();
    } catch (error) {
      alert('Ошибка сохранения: ' + error.message);
    }
  }

  async deleteTask(id) {
    if (!confirm('Удалить задачу?')) return;

    try {
      await this.apiCall(`/tasks/${id}`, { method: 'DELETE' });
      await this.loadTasks();
    } catch (error) {
      alert('Ошибка удаления: ' + error.message);
    }
  }

  closeModal() {
    document.getElementById('editModal').classList.remove('active');
    this.editingId = null;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login.html';
  }
}

const app = new TodoApp();