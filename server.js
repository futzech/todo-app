const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Data storage paths
const USERS_FILE = path.join(__dirname, 'users.json');
const TASKS_FILE = path.join(__dirname, 'tasks.json');

// Safe file init
async function ensureFileExists(filePath, defaultContent) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
    console.log(`Created ${filePath}`);
  }
}

// Init on startup
async function initData() {
  try {
    await ensureFileExists(USERS_FILE, { users: [] });
    await ensureFileExists(TASKS_FILE, {});
    console.log('Data files ready');
  } catch (error) {
    console.error('Init error:', error);
  }
}

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const usersData = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    if (usersData.users.find(u => u.username === username.trim())) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 12);
    const newUser = {
      id: Date.now().toString(),
      username: username.trim(),
      password: hashedPassword
    };

    usersData.users.push(newUser);
    await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));

    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: newUser.id, username: newUser.username } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const usersData = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
    const user = usersData.users.find(u => u.username === username.trim());

    if (!user || !(await bcrypt.compare(password.trim(), user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasksData = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
    const userTasks = tasksData[req.user.id] || [];
    res.json(userTasks);
  } catch (error) {
    console.error('Tasks GET error:', error);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title required' });
    }

    const tasksData = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
    if (!tasksData[req.user.id]) tasksData[req.user.id] = [];

    const newTask = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasksData[req.user.id].push(newTask);
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasksData, null, 2));

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Tasks POST error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const tasksData = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
    if (!tasksData[req.user.id]) return res.status(404).json({ error: 'No tasks found' });

    const taskIndex = tasksData[req.user.id].findIndex(t => t.id === id);
    if (taskIndex === -1) return res.status(404).json({ error: 'Task not found' });

    tasksData[req.user.id][taskIndex] = { ...tasksData[req.user.id][taskIndex], ...updates };
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasksData, null, 2));

    res.json(tasksData[req.user.id][taskIndex]);
  } catch (error) {
    console.error('Tasks PUT error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const tasksData = JSON.parse(await fs.readFile(TASKS_FILE, 'utf8'));
    if (!tasksData[req.user.id]) return res.status(404).json({ error: 'No tasks found' });

    tasksData[req.user.id] = tasksData[req.user.id].filter(t => t.id !== id);
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasksData, null, 2));

    res.status(204).send();
  } catch (error) {
    console.error('Tasks DELETE error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function start() {
  try {
    await initData();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Data: ${__dirname}`);
    });
  } catch (error) {
    console.error('Server start failed:', error);
  }
}

start();