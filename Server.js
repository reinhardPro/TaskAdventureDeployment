const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./TAdatabase.db');


const { db, createUser, findUser, getTasks } = require('./db/database');

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.render('Login', { error: 'Je moet eerst inloggen om deze pagina te bekijken.' });
  }
  next();
}

const app = express();
const port = 3000;

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
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 3600000,
    sameSite: 'lax'
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Home route (with dynamic user state)
app.get('/', (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.redirect('/Login'); // Redirect to login if no user is logged in
  }

  const userId = user.id;

  // Fetch pending tasks for the logged-in user
  db.all(`SELECT * FROM tasks WHERE userId = ? AND pending = 1`, [userId], (err, tasks) => {
    if (err) {
      return res.status(500).send('Error fetching tasks');
    }

    // Render the home page with tasks
    res.render('home', { user, tasks });
  });
});

// Stats route
app.get('/Stats', (req, res) => {
  res.render('Stats');
});

// Taskmanager route
app.get('/Taskmanager',requireLogin,(req, res) => {

  const userId = req.session.user.id;

  // Fetch tasks for the logged-in user
  db.all(`SELECT * FROM tasks WHERE userId = ?`, [userId], (err, tasks) => {
    if (err) {
      return res.status(500).send('Error fetching tasks');
    }
    res.render('Taskmanager', { tasks });
  });
});

// Handle task creation
app.post('/Taskmanager', requireLogin, (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }

  const { taskName, taskValue, taskLevel, taskDeadline, taskDescription } = req.body;
  const userId = req.session.user.id;

  // Insert new task into the database
  db.run(
    `INSERT INTO tasks (userId, title, description, dueDate, completed, xp) VALUES (?, ?, ?, ?, 0, ?)`, 
    [userId, taskName, taskDescription, taskDeadline, taskValue],
    function(err) {
      if (err) {
        return res.status(500).send('Error adding task');
      }

      res.redirect('/Taskmanager');
    }
  );
});

// Accept a task
app.post('/task/accept/:id', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }

  const taskId = req.params.id;

  db.run('UPDATE tasks SET pending = 1 WHERE id = ? AND userId = ? AND completed = 0', [taskId, req.session.user.id], (err) => {
    if (err) {
      return res.status(500).send('Error accepting task');
    }
    res.redirect('/Taskmanager');
  });
});

// Delete a task
app.post('/task/delete/:id', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }

  const taskId = req.params.id;

  // Delete the task from the database
  db.run('DELETE FROM tasks WHERE id = ? AND userId = ?', [taskId, req.session.user.id], (err) => {
    if (err) {
      return res.status(500).send('Error deleting task');
    }
    res.redirect('/Taskmanager');
  });
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
      return res.render('Login', { error: 'Gebruiker niet gevonden' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.render('Login', { error: 'Wachtwoord incorrect' });
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
    req.session.user = { id: userId, username, email };

    res.redirect('/CharacterCreation');
  });
});

// Focus Mode route
app.get('/FocusMode', requireLogin, (req, res) => {
  res.render('FocusMode');
});

// Settings route
app.get('/Settings', requireLogin, (req, res) => {
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
app.get('/CharacterCreation', requireLogin, (req, res) => {
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
