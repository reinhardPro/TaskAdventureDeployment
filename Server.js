const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const { db, createUser, findUser, getTasks } = require('./db/database');

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.render('Login', { error: 'Je moet eerst inloggen om deze pagina te bekijken.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.render('Login', { error: 'Je moet eerst inloggen om deze pagina te bekijken.' });
  }

  const userId = req.session.user.id;

  db.get(`
    SELECT r.name FROM roles r
    INNER JOIN user_roles ur ON ur.roleId = r.id
    WHERE ur.userId = ?
  `, [userId], (err, row) => {
    if (err || !row || row.name !== 'admin') {
      return res.render('Login', { error: 'Je hebt geen toegang tot deze pagina. Je moet een admin zijn.' });
    }
    next();
  });
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

// Home
app.get('/', (req, res) => {
  const user = req.session.user;
  if (user) {
    db.all('SELECT * FROM tasks WHERE userId = ? AND pending = 1', [user.id], (err, tasks) => {
      if (err) return res.status(500).send('Error fetching tasks');
      res.render('home', { user, tasks });
    });
  } else {
    res.render('home', { user: null, tasks: [] });
  }
});

// Stats
app.get('/Stats', requireLogin, (req, res) => res.render('Stats'));

// Task Manager
app.get('/Taskmanager', requireLogin, (req, res) => {
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

//Stats route
app.get('/Stats', requireLogin, (req, res) => {
  const userId = req.session.user?.id;

  // Fetch stats for the logged-in user
  db.get('SELECT * FROM stats WHERE userId = ?', [userId], (err, stat) => {
    if (err) {
      console.error('Error fetching stats:', err);
      return res.status(500).send('Error fetching stats');
    }
    if (!stat) {
      return res.status(404).send('No stats found for this user');
    }

    //Render the "Stats" view with stats 
    res.render('Stats', { stats: stat });
  });
});

//profile route
app.get('/Profile', (req, res) => {
  res.render('Profile');
});

// Taskmanager route
app.get('/Taskmanager', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }
  const userId = req.session.user.id;
  db.all(`SELECT * FROM tasks WHERE userId = ?`, [userId], (err, tasks) => {

    if (err) return res.status(500).send('Error fetching tasks');
    res.render('Taskmanager', { tasks });
  });
});

app.post('/Taskmanager', (req, res) => {
  if (!req.session.user) return res.redirect('/Login');
  const { taskName, taskValue, taskDeadline, taskDescription } = req.body;

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
  db.run(
    `INSERT INTO tasks (userId, title, description, dueDate, completed, xp) VALUES (?, ?, ?, ?, 0, ?)`,
    [userId, taskName, taskDescription, taskDeadline, taskValue],
    err => {
      if (err) return res.status(500).send('Error adding task');
      res.redirect('/Taskmanager');
    }
  );
});

app.post('/task/accept/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/Login');
  const taskId = req.params.id;
  db.run('UPDATE tasks SET pending = 1 WHERE id = ? AND userId = ?', [taskId, req.session.user.id], err => {
    if (err) return res.status(500).send('Error accepting task');

  db.run('UPDATE tasks SET pending = 1 WHERE id = ? AND userId = ? AND completed = 0', [taskId, req.session.user.id], (err) => {
    if (err) {
      return res.status(500).send('Error accepting task');
    }
    res.redirect('/Taskmanager');
  });
});

app.post('/task/delete/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/Login');
  const taskId = req.params.id;
  db.run('DELETE FROM tasks WHERE id = ? AND userId = ?', [taskId, req.session.user.id], err => {
    if (err) return res.status(500).send('Error deleting task');

  // Delete the task from the database
  db.run('DELETE FROM tasks WHERE id = ? AND userId = ?', [taskId, req.session.user.id], (err) => {
    if (err) {
      return res.status(500).send('Error deleting task');
    }
    res.redirect('/Taskmanager');
  });

app.get('/Taskmanager', requireLogin, (req, res) => {
  res.render('Taskmanager');
});
});

// Login
app.get('/Login', (req, res) => res.render('Login'));

app.post('/Login', (req, res) => {
  const { username, password } = req.body;
  findUser(username, (err, user) => {

    if (err || !user) return res.render('Login', { error: 'Gebruiker niet gevonden.' });
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) return res.render('Login', { error: 'Wachtwoord incorrect.' });
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

// Create Account
app.get('/CreateAccount', (req, res) => res.render('CreateAccount'));

app.post('/CreateAccount', (req, res) => {
  const { email, username, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.status(400).send('Passwords do not match');

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  createUser(email, username, password, (err, userId) => {
    if (err) return res.status(500).send('Error creating user');
    req.session.user = { id: userId, username, email };
    res.redirect('/CharacterCreation');
  });
});

// Focus Mode
app.get('/FocusMode', requireLogin, (req, res) => res.render('FocusMode'));

// Settings
app.get('/Settings', requireLogin, (req, res) => res.render('Settings'));

// Focus Mode route
app.get('/FocusMode', requireLogin, (req, res) => {
  res.render('FocusMode');
});

// Settings route
app.get('/Settings', requireLogin, (req, res) => {
  const user = req.session.user;
  res.render('Settings', { user });
});

// Handle change password request
app.post('/Settings/changePassword', requireLogin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.session.user;

  findUser(user.username, (err, dbUser) => {
    if (err || !dbUser) {
      return res.status(500).send('User not found');
    }

    bcrypt.compare(currentPassword, dbUser.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.render('Settings', { error: 'Incorrect current password' });
      }

      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).send('Error hashing new password');
        }

        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
          if (err) {
            return res.status(500).send('Error updating password');
          }

          res.render('Settings', { success: 'Password updated successfully' });
        });
      });
    });
  });
});

// Handle account removal
app.post('/Settings/removeAccount', requireLogin, (req, res) => {
  const user = req.session.user;

  db.run('DELETE FROM users WHERE id = ?', [user.id], (err) => {
    if (err) {
      return res.status(500).send('Error deleting account');
    }

    db.run('DELETE FROM tasks WHERE userId = ?', [user.id], (err) => {
      if (err) {
        return res.status(500).send('Error deleting tasks');
      }

      req.session.destroy(() => {
        res.redirect('/');
      });
    });
  });
});

// Access Rights and Permissions link
app.get('/access-rights', (req, res) => {
  res.redirect('https://en.wikipedia.org/wiki/Access_control');
});

// Leaderboard
app.get('/leaderboard', (req, res) => {
  db.all('SELECT name, xp, gender FROM characters ORDER BY xp DESC LIMIT 10', [], (err, rows) => {
    if (err) return res.status(500).send("Database error");
    const top3 = rows.slice(0, 3);
    const others = rows.slice(3);
    res.render('LeaderBoard', { top3, others });

      if (err) {
          console.error("Query error:", err.message);  // Log specific error
          return res.status(500).send("Database error");
      }

      const top3 = rows.slice(0, 3);
      const others = rows.slice(3);

      res.render('LeaderBoard', { top3, others });
  });
});

// Character Creation
app.get('/CharacterCreation', requireLogin, (req, res) => res.render('CharacterCreation'));

// Logout
app.post('/Logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Admin Panel
app.get('/AdminPanel', requireAdmin, (req, res) => {
  db.all(`
    SELECT u.id AS userId, u.username, u.email,
           c.id AS characterId, c.name AS characterName,
           t.id AS taskId, t.title AS taskTitle, t.pending
    FROM users u
    LEFT JOIN characters c ON u.id = c.userId
    LEFT JOIN tasks t ON u.id = t.userId AND t.pending = 1
    ORDER BY u.id
  `, [], (err, rows) => {
    if (err) return res.status(500).send('Failed to load admin panel');
    const usersMap = {};
    rows.forEach(row => {
      if (!usersMap[row.userId]) {
        usersMap[row.userId] = {
          id: row.userId,
          username: row.username,
          email: row.email,
          characters: [],
          tasks: []
        };
      }
      if (row.characterId && !usersMap[row.userId].characters.find(c => c.id === row.characterId)) {
        usersMap[row.userId].characters.push({ id: row.characterId, name: row.characterName });
      }
      if (row.taskId && !usersMap[row.userId].tasks.find(t => t.id === row.taskId)) {
        usersMap[row.userId].tasks.push({ id: row.taskId, title: row.taskTitle });
      }
    });

    res.render('AdminPanel', { users: Object.values(usersMap) });
  });
});

// Admin actions
app.post('/admin/change-username', requireAdmin, (req, res) => {
  const { userId, newUsername } = req.body;
  db.run(`UPDATE users SET username = ? WHERE id = ?`, [newUsername, userId], err => {
    if (err) return res.status(500).send('Error updating username');
    res.redirect('/AdminPanel');
  });
});

app.post('/admin/delete-user', requireAdmin, (req, res) => {
  const { userId } = req.body;
  db.run(`DELETE FROM users WHERE id = ?`, [userId], err => {
    if (err) return res.status(500).send('Error deleting user');
    res.redirect('/AdminPanel');
  });
});

app.post('/admin/delete-character', requireAdmin, (req, res) => {
  const { characterId } = req.body;
  db.run(`DELETE FROM characters WHERE id = ?`, [characterId], err => {
    if (err) return res.status(500).send('Error deleting character');
    res.redirect('/AdminPanel');
  });
});

app.post('/admin/finish-task', requireAdmin, (req, res) => {
  const { taskId } = req.body;
  db.run(`UPDATE tasks SET pending = 0, completed = 1 WHERE id = ?`, [taskId], err => {
    if (err) return res.status(500).send('Failed to finish task');
    res.redirect('/AdminPanel');
  });
});

app.post('/admin/delete-task', requireAdmin, (req, res) => {
  const { taskId } = req.body;
  db.run(`DELETE FROM tasks WHERE id = ?`, [taskId], err => {
    if (err) return res.status(500).send('Failed to delete task');
    res.redirect('/AdminPanel');

// Character Creation route
app.get('/CharacterCreation', requireLogin, (req, res) => {
  res.render('CharacterCreation');
});

app.post('/CharacterCreation', (req, res) => {
  const { name, gender, imagevalue } = req.body;
  const userId = req.session.user?.id; // Correct session access

  console.log("POST /CharacterCreation:");
  console.log({ name, gender, imagevalue, userId });

  if (!userId) {
    console.error("User ID is missing from session.");
    return res.status(401).send("Unauthorized: You must be logged in.");
  }

  db.run(
    'INSERT INTO characters (name, gender, imagevalue, userId) VALUES (?, ?, ?, ?)',
    [name, gender, imagevalue, userId],
    function(err) {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).send('Error adding character');
      }
      res.redirect('/CharacterCreation');
    }
  );
});

// Logout route
app.post('/Logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});
    
//GET request profile page
app.get('/api/profile', (req, res) => {
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ success: false });

  db.get(`SELECT username, email FROM users WHERE id = ?`, [userId], (err, row) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, data: row });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});