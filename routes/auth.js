const express = require('express');
const router = express.Router();
const db = require('../db');

// Register
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
    if (err) return res.send('Error or user exists');
    res.redirect('/');
  });
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
    if (results.length > 0) {
      req.session.userId = results[0].id;
      res.redirect('/dashboard.html');
    } else {
      res.send('Invalid credentials');
    }
  });
});

module.exports = router;
