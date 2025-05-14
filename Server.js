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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,  // Set this to true in production with HTTPS
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

  if (!user) {
    return res.render('home', { user: null, tasks: [] });
  }

  const userId = user.id;

  db.get(`SELECT name, level, xp FROM characters WHERE userId = ?`, [userId], (err, character) => {
    if (err) return res.status(500).send("DB Error bij ophalen karakter");

    db.all(`SELECT * FROM tasks WHERE userId = ? AND pending = 1`, [userId], (err, tasks) => {
      if (err) return res.status(500).send("DB Error bij ophalen taken");

      res.render('home', {
        user: {
          id: userId,
          charactername: character?.name,
          level: character?.level,
          xp: character?.xp
        },
        tasks
      });
    });
  });
});

// XP gain route
app.post('/api/gain-xp', (req, res) => {
  const userId = req.session.user.id;
  const xpGained = req.body.xpGained;

  db.get('SELECT xp, level FROM characters WHERE userId = ?', [userId], (err, character) => {
    if (err || !character) return res.status(500).json({ error: 'User not found' });

    let newXP = character.xp + xpGained;
    let newLevel = character.level;
    let leveledUp = false;

    const xpThreshold = 100;

    if (newXP >= xpThreshold) {
      newLevel += 1;
      newXP = newXP - xpThreshold;
      leveledUp = true;
    }

    db.run('UPDATE characters SET xp = ?, level = ? WHERE userId = ?', [newXP, newLevel, userId], (err) => {
      if (err) return res.status(500).json({ error: 'Update failed' });

      res.json({
        xp: newXP,
        level: newLevel,
        leveledUp
      });
    });
  });
});

// Taak voltooien + XP toekennen
app.post('/api/complete-task', (req, res) => {
  const userId = req.session.user?.id;
  const taskId = req.body.taskId;

  if (!userId || !taskId) {
    return res.status(400).json({ error: 'Ongeldige aanvraag' });
  }

  db.get('SELECT xp FROM tasks WHERE id = ? AND userId = ?', [taskId, userId], (err, task) => {
    if (err || !task) return res.status(404).json({ error: 'Taak niet gevonden' });

    const xpGained = task.xp;

    db.run('UPDATE tasks SET pending = 0 WHERE id = ? AND userId = ?', [taskId, userId], function (err) {
      if (err) return res.status(500).json({ error: 'Taak kon niet worden voltooid' });

      db.get('SELECT xp, level FROM characters WHERE userId = ?', [userId], (err, character) => {
        if (err || !character) return res.status(500).json({ error: 'Karakter niet gevonden' });

        let newXP = character.xp + xpGained;
        let newLevel = character.level;
        let leveledUp = false;

        if (newXP >= 100) {
          newLevel += 1;
          newXP -= 100;
          leveledUp = true;
        }

        db.run('UPDATE characters SET xp = ?, level = ? WHERE userId = ?', [newXP, newLevel, userId], (err) => {
          if (err) return res.status(500).json({ error: 'XP kon niet worden opgeslagen' });

          res.json({
            xp: newXP,
            level: newLevel,
            leveledUp
          });
        });
      });
    });
  });
});


//Stats route
app.get('/Stats', requireLogin, (req, res) => {
  const userId = req.session.user?.id;
  const username =req.session.user?.username;
  // Fetch stats for the logged-in user
  db.get('SELECT * FROM stats WHERE username = ?', [username], (err, stat) => {
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


// Task Manager
app.get('/Taskmanager', requireLogin, (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }

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
  const { taskName, taskValue, taskDeadline, taskDescription } = req.body;
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

// Handle task accept
app.post('/task/accept/:id', requireLogin, (req, res) => {
  const taskId = req.params.id;
  db.run('UPDATE tasks SET pending = 1 WHERE id = ? AND userId = ?', [taskId, req.session.user.id], err => {
    if (err) return res.status(500).send('Error accepting task');
    res.redirect('/Taskmanager');
  });
});

// Handle task delete
app.post('/task/delete/:id', requireLogin, (req, res) => {
  const taskId = req.params.id;
  db.run('DELETE FROM tasks WHERE id = ? AND userId = ?', [taskId, req.session.user.id], err => {
    if (err) return res.status(500).send('Error deleting task');
    res.redirect('/Taskmanager');
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
      req.session.user = user;
      res.redirect('/');
    });
  });
});

// Create Account
app.get('/CreateAccount', (req, res) => res.render('CreateAccount'));

app.post('/CreateAccount', (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('CreateAccount', { error: 'Passwords do not match.' });
  }

  createUser(email, username, password, (err, userId) => {
    if (err) return res.status(500).send('Error creating user');
    req.session.user = { id: userId, username, email };
    res.redirect('/CharacterCreation');
  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
    if (err) {
      return res.render('CreateAccount', { error: 'An error has occurd. Try again.' });
    }

    if (existingUser) {
      return res.render('CreateAccount', { error: 'Username or e-mail already exists.' });
    }

    // Als uniek, aanmaken
    createUser(email, username, password, (err, userId) => {
      if (err) {
        return res.render('CreateAccount', { error: 'An error has occurd while trying to make your account.' });
      }
      req.session.user = { id: userId, username, email };
      res.redirect('/CharacterCreation');
    });
  });
});
});

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
      return res.render('Settings', { 
        alert: { type: 'error', message: 'User not found' }
      });
    }

    bcrypt.compare(currentPassword, dbUser.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.render('Settings', { 
          alert: { type: 'error', message: 'Incorrect current password' }
        });
      }

      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          return res.render('Settings', { 
            alert: { type: 'error', message: 'Error hashing new password' }
          });
        }

        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
          if (err) {
            return res.render('Settings', { 
              alert: { type: 'error', message: 'Error updating password' }
            });
          }

          res.render('Settings', { 
            alert: { type: 'success', message: 'Password updated successfully' }
          });
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
      return res.render('Settings', { 
        alert: { type: 'error', message: 'Error deleting account' }
      });
    }

    db.run('DELETE FROM tasks WHERE userId = ?', [user.id], (err) => {
      if (err) {
        return res.render('Settings', { 
          alert: { type: 'error', message: 'Error deleting tasks' }
        });
      }

      req.session.destroy(() => {
        return res.render('Settings', { 
          alert: { type: 'success', message: 'Your account has been successfully deleted.' }
        });
    });
  });
});
});
// Access Rights and Permissions link
app.get('/access-rights', (req, res) => {
  res.redirect('https://en.wikipedia.org/wiki/Access_control');
});

app.get('/leaderboard', (req, res) => {
  db.all('SELECT name, xp, imagevalue FROM characters ORDER BY xp DESC LIMIT 10', [], (err, rows) => {
    if (err) {
      console.error("Query error:", err.message);
      return res.status(500).send("Database error");
    }

    const top3 = rows.slice(0, 3);
    const others = rows.slice(3);

    res.render('LeaderBoard', { top3, others });
  });
});

app.post('/admin/delete-user', requireAdmin, (req, res) => {
  const { userId } = req.body;
  db.run(`DELETE FROM users WHERE id = ?`, [userId], err => {
    if (err) return res.status(500).send('Error deleting user');
    res.redirect('/AdminPanel');
  });
});

// Character Creation
app.get('/CharacterCreation', requireLogin, (req, res) => res.render('CharacterCreation'));

app.post('/CharacterCreation', (req, res) => {
  const { name, gender, imagevalue } = req.body;
  const userId = req.session.user?.id;

  if (!userId) return res.status(401).send("Unauthorized: You must be logged in.");

  db.run(
    'INSERT INTO characters (name, gender, imagevalue, userId) VALUES (?, ?, ?, ?)',
    [name, gender, imagevalue, userId],
    function(err) {
      if (err) return res.status(500).send('Error adding character');
      res.redirect('/CharacterCreation');
    }
  );
});

app.get('/profile', requireLogin, (req, res) => {
  const user = req.session.user;

  db.get(`SELECT username, email FROM users WHERE id = ?`, [user.id], (err, row) => {
    if (err) {
      return res.status(500).send('Fout bij ophalen profiel.');
    }

    res.render('Profile', { user: row });
  });
});


app.post('/profile/update', requireLogin, (req, res) => {
  const { username, email } = req.body;
  const userId = req.session.user.id;

  if (!username || !email) {
    return res.status(400).json({ success: false, message: 'Alle velden zijn verplicht!' });
  }

  const checkSql = `SELECT id FROM users WHERE username = ? AND id != ?`;
  db.get(checkSql, [username, userId], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Databasefout.' });
    }

    if (row) {
      return res.status(400).json({ success: false, message: 'Gebruikersnaam al in gebruik.' });
    }

    const getOldUsernameSql = `SELECT username FROM users WHERE id = ?`;
    db.get(getOldUsernameSql, [userId], (err, user) => {
      if (err || !user) {
        return res.status(500).json({ success: false, message: 'Gebruiker niet gevonden.' });
      }

      const oldUsername = user.username;

      const updateUserSql = `UPDATE users SET username = ?, email = ? WHERE id = ?`;
      db.run(updateUserSql, [username, email, userId], function (err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Fout bij gebruikersupdate.' });
        }

        const updateStatsSql = `UPDATE stats SET username = ? WHERE username = ?`;
        db.run(updateStatsSql, [username, oldUsername], function (err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Fout bij stats-update.' });
          }

          req.session.user.username = username;
          req.session.user.email = email;

          return res.json({ success: true, message: 'Profiel succesvol bijgewerkt.' });
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
