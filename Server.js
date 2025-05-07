const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./TAdatabase.db');

// Express setup
const app = express();
const port = 3000;

// Set up express-handlebars engine
app.engine('hbs', exphbs.engine({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/Layouts'),
  partialsDir: path.join(__dirname, 'views/Partials')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true
}));

// Home route (with dynamic user state)
app.get('/', (req, res) => {
  const user = req.session.user;
  res.render('home', { user });
});

// Stats route
app.get('/Stats', (req, res) => {
  res.render('Stats');
});

// Taskmanager route
app.get('/Taskmanager', (req, res) => {
  res.render('Taskmanager');
});

// Login route
app.get('/Login', (req, res) => {
  res.render('Login');
});

// Handle Login POST request
app.post('/Login', (req, res) => {
  const { username, password } = req.body;

  findUser(username, (err, user) => {
    if (err || !user) {
      return res.status(400).send('User not found');
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(400).send('Incorrect password');
      }

      // Store user in session
      req.session.user = user;
      res.redirect('/');
    });
  });
});

// Create Account route
app.get('/CreateAccount', (req, res) => {
  res.render('CreateAccount');
});

// Handle Create Account POST request
app.post('/CreateAccount', (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  createUser(email, username, password, (err, userId) => {
    if (err) {
      return res.status(500).send('Error creating user');
    }

    // Optionally, you could store the user in the session after account creation
    req.session.user = { id: userId, username, email }; // Create session data for the new user

    res.redirect('/Login');
  });
});

// Focus Mode route
app.get('/FocusMode', (req, res) => {
  res.render('FocusMode');
});

// Settings route
app.get('/Settings', (req, res) => {
  res.render('Settings');
});

app.get('/leaderboard', (req, res) => {
  db.all('SELECT name, xp FROM characters ORDER BY xp DESC LIMIT 10', [], (err, rows) => {
      if (err) {
          console.error("Query error:", err.message);  // Log specific error
          return res.status(500).send("Database error");
      }

      const top3 = rows.slice(0, 3);
      const others = rows.slice(3);

      res.render('LeaderBoard', { top3, others });
  });
});



// Import database functions
const { createUser, findUser } = require('./db/database');

// Character Creation route
app.get('/CharacterCreation', (req, res) => {
  res.render('CharacterCreation');
});

// Logout route
app.post('/Logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
