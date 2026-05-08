require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const fs      = require('fs');

const bot = require('./bot');
const { readDB, writeDB, generateId } = require('./db');
const { getAIRecommendations }        = require('./openai');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Serve built React frontend ────────────────────────────────────────────
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// ─── Auth middleware ───────────────────────────────────────────────────────

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token topilmadi' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Yaroqsiz token' }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin huquqi kerak' });
  next();
}

// ─── Auth routes ───────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db   = readDB();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Login yoki parol xato' });
  if (user.isBlocked) return res.status(403).json({ message: 'Hisobingiz bloklangan. Admin bilan bog\'laning.' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: sanitize(user) });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, age, gender, location, interests, profession, goal } = req.body;
  const db = readDB();
  if (db.users.find(u => u.username === username))
    return res.status(400).json({ message: 'Bu login band' });
  const user = {
    _id: generateId(),
    username,
    password,
    role: 'user',
    isBlocked: false,
    demographics: {
      age: Number(age), gender, location, profession, goal,
      interests: Array.isArray(interests) ? interests : (interests || '').split(',').map(i => i.trim()),
    },
    passwordHistory: [{ password, changedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  writeDB(db);
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: sanitize(user) });
});

// ─── Profile ───────────────────────────────────────────────────────────────

app.get('/api/profile', auth, (req, res) => {
  const db   = readDB();
  const user = db.users.find(u => u._id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Topilmadi' });
  res.json(sanitize(user));
});

app.put('/api/profile/demographics', auth, (req, res) => {
  const db  = readDB();
  const idx = db.users.findIndex(u => u._id === req.user.id);
  if (idx === -1) return res.status(404).json({ message: 'Topilmadi' });
  db.users[idx].demographics = { ...db.users[idx].demographics, ...req.body };
  writeDB(db);
  res.json(sanitize(db.users[idx]));
});

// ─── Password change (user) ────────────────────────────────────────────────

app.put('/api/profile/password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'Yangi parol kamida 6 ta belgi' });
  const db  = readDB();
  const idx = db.users.findIndex(u => u._id === req.user.id);
  if (idx === -1) return res.status(404).json({ message: 'Topilmadi' });
  const user = db.users[idx];
  if (user.password !== oldPassword)
    return res.status(400).json({ message: 'Eski parol noto\'g\'ri' });
  user.password = newPassword;
  if (!user.passwordHistory) user.passwordHistory = [];
  user.passwordHistory.push({ password: newPassword, changedAt: new Date().toISOString() });
  writeDB(db);
  res.json({ message: 'Parol muvaffaqiyatli yangilandi' });
});

// ─── AI Recommendations ────────────────────────────────────────────────────

app.get('/api/recommendations', auth, async (req, res) => {
  const db   = readDB();
  const user = db.users.find(u => u._id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Topilmadi' });
  if (user.isBlocked) return res.status(403).json({ message: 'Hisobingiz bloklangan' });
  try {
    const recs = await getAIRecommendations(user.demographics);
    res.json(recs);
  } catch (e) {
    res.status(500).json({ message: 'AI xatolik: ' + e.message });
  }
});

// ─── Admin: Users ──────────────────────────────────────────────────────────

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const db = readDB();
  res.json(db.users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  const db   = readDB();
  const user = db.users.find(u => u._id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Topilmadi' });
  res.json(user); // Full data including passwordHistory
});

app.delete('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u._id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Topilmadi' });
  if (user.role === 'admin') return res.status(403).json({ message: 'Admin o\'chirilmaydi' });
  db.users = db.users.filter(u => u._id !== req.params.id);
  writeDB(db);
  res.json({ message: "Foydalanuvchi o'chirildi" });
});

// ─── Admin: Block / Unblock ────────────────────────────────────────────────

app.patch('/api/admin/users/:id/block', auth, adminOnly, (req, res) => {
  const db  = readDB();
  const idx = db.users.findIndex(u => u._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Topilmadi' });
  if (db.users[idx].role === 'admin') return res.status(403).json({ message: 'Admin bloklanmaydi' });
  db.users[idx].isBlocked = true;
  db.users[idx].blockedAt = new Date().toISOString();
  writeDB(db);
  res.json({ message: 'Foydalanuvchi bloklandi' });
});

app.patch('/api/admin/users/:id/unblock', auth, adminOnly, (req, res) => {
  const db  = readDB();
  const idx = db.users.findIndex(u => u._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Topilmadi' });
  db.users[idx].isBlocked  = false;
  db.users[idx].blockedAt  = null;
  writeDB(db);
  res.json({ message: 'Foydalanuvchi blokdan chiqarildi' });
});

// ─── Admin: Reset user password ────────────────────────────────────────────

app.patch('/api/admin/users/:id/reset-password', auth, adminOnly, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'Parol kamida 6 ta belgi' });
  const db  = readDB();
  const idx = db.users.findIndex(u => u._id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Topilmadi' });
  db.users[idx].password = newPassword;
  if (!db.users[idx].passwordHistory) db.users[idx].passwordHistory = [];
  db.users[idx].passwordHistory.push({ password: newPassword, changedAt: new Date().toISOString(), resetBy: 'admin' });
  writeDB(db);
  res.json({ message: 'Parol tiklandi', newPassword });
});

// ─── Admin: Broadcast ──────────────────────────────────────────────────────

app.post('/api/admin/broadcast', auth, adminOnly, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Xabar bo\'sh' });
  const db = readDB();
  const targets = db.users.filter(u => u.role !== 'admin' && u.chatId && !u.isBlocked);
  let sent = 0, failed = 0;
  for (const u of targets) {
    try {
      await bot.telegram.sendMessage(u.chatId, `📢 Admin xabari:\n\n${message}`);
      sent++;
    } catch { failed++; }
  }
  res.json({ message: `Yuborildi: ${sent}, Xatolik: ${failed}` });
});

// ─── Admin: Stats ──────────────────────────────────────────────────────────

app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
  const db    = readDB();
  const users = db.users.filter(u => u.role !== 'admin');
  const now   = new Date();

  const genderStats  = count(users, u => u.demographics?.gender  || 'Noaniq');
  const locationStats= count(users, u => u.demographics?.location || 'Noaniq');
  const ageGroups    = count(users, u => ageGroup(u.demographics?.age));
  const interestStats= {};
  users.forEach(u => (u.demographics?.interests || []).forEach(i => { interestStats[i] = (interestStats[i]||0)+1; }));
  const blockedCount = users.filter(u => u.isBlocked).length;
  const botUsers     = users.filter(u => u.chatId).length;
  const last7days    = users.filter(u => {
    const d = new Date(u.createdAt);
    return (now - d) / 864e5 <= 7;
  }).length;

  res.json({
    totalUsers: users.length,
    blockedCount, botUsers, last7days,
    genderStats, locationStats, ageGroups,
    interestStats: Object.entries(interestStats).sort((a,b)=>b[1]-a[1]).slice(0,10),
  });
});

function count(arr, key) {
  return arr.reduce((acc, u) => { const k = key(u); acc[k] = (acc[k]||0)+1; return acc; }, {});
}
function ageGroup(age) {
  if (!age) return 'Noaniq';
  if (age < 18) return '18 dan kichik';
  if (age < 25) return '18–24';
  if (age < 35) return '25–34';
  if (age < 45) return '35–44';
  return '45+';
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function sanitize(u) {
  const { passwordHistory, ...rest } = u;
  return rest; // don't expose history to self — admin gets full data
}

// ─── SPA fallback (React Router) ──────────────────────────────────────────
if (fs.existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ─── Start ─────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server :${PORT} da ishlamoqda`);
  bot.launch()
    .then(() => console.log('Telegram Bot ishlamoqda'))
    .catch(err => console.error('Bot xatosi:', err.message));
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
