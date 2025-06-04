// Start log
console.log('🟡 Starting server.js...');

require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
console.log('✅ Express app created, PORT set to', PORT);

const db = new sqlite3.Database('./db/eventease.db', (err) => {
  if (err) console.error('❌ Failed to connect to database:', err.message);
  else {
    console.log('✅ Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      isAdmin INTEGER DEFAULT 0
    )`);
    db.run(`INSERT OR IGNORE INTO users (username, password, isAdmin)
            VALUES ('jane_admin', 'whatever', 1)`);

    db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      location TEXT,
      category TEXT NOT NULL,
      date TEXT,
      lat REAL,
      lon REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventID INTEGER,
      ticketType TEXT,
      price REAL,
      availability INTEGER
    )`);
  }
});

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));
app.use(express.static(path.join(__dirname, 'public')));

// LOGIN
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid login' });

    req.session.user = { id: user.id, username: user.username };
    res.json({ user: { id: user.id, username: user.username, isAdmin: !!user.isAdmin } });
  });
});

app.get('/session', (req, res) => {
  if (req.session.user) {
    const { id, username } = req.session.user;
    db.get('SELECT isAdmin FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ user: { id, username, isAdmin: !!row?.isAdmin } });
    });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// EVENTS
app.get('/events', (req, res) => {
  const location = req.query.location;
  const query = location && location.trim() !== ''
    ? ['SELECT * FROM events WHERE location LIKE ?', [`%${location}%`]]
    : ['SELECT * FROM events'];

  db.all(...query, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/events', (req, res) => {
  const { name, description, location, category, date, lat, lon } = req.body;
  console.log('🟡 Incoming event:', req.body);

  if (!name || !description || !location || !date || !category) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const dbDate = date.includes('-') ? date.replace(/-/g, '').slice(2) : date;
  const safeLat = isNaN(parseFloat(lat)) ? null : parseFloat(lat);
  const safeLon = isNaN(parseFloat(lon)) ? null : parseFloat(lon);

  db.run(
    'INSERT INTO events (name, description, location, category, date, lat, lon) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, description, location, category, dbDate, safeLat, safeLon],
    function (err) {
      if (err) {
        console.error('❌ Insert failed:', err.message);
        return res.status(500).json({ error: 'Insert failed', details: err.message });
      }
      res.json({ id: this.lastID, name, description, location, category, date: dbDate, lat: safeLat, lon: safeLon });
    }
  );
});

app.put('/events/:id', (req, res) => {
  const { name, description, location, category, date, lat, lon } = req.body;
  if (!name || !description || !location || !date || !category) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const dbDate = date.includes('-') ? date.replace(/-/g, '').slice(2) : date;
  const safeLat = lat ? parseFloat(lat) : null;
  const safeLon = lon ? parseFloat(lon) : null;

  db.run(
    'UPDATE events SET name = ?, description = ?, location = ?, category = ?, date = ?, lat = ?, lon = ? WHERE id = ?',
    [name, description, location, category, dbDate, safeLat, safeLon, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Update failed' });
      if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ id: req.params.id, name, description, location, category, date: dbDate, lat: safeLat, lon: safeLon });
    }
  );
});

app.delete('/events/:id', (req, res) => {
  db.run('DELETE FROM events WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ message: 'Deleted' });
  });
});

// TICKETS
app.get('/tickets/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  db.all('SELECT * FROM tickets WHERE eventID = ?', [eventId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
