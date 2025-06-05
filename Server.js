const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads'); // Zorg dat deze map bestaat
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

const { db, createUser, findUser, getTasks, getCharacterInfoByBaseImage } = require('./db/database');

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.render('Login', { error: 'You must first log in to view this page.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.render('Login', { error: 'You must first log in to view this page.' });
  }

  const userId = req.session.user.id;

  db.get(`
    SELECT r.name FROM roles r
    INNER JOIN user_roles ur ON ur.roleId = r.id
    WHERE ur.userId = ?
  `, [userId], (err, row) => {
    if (err || !row || row.name !== 'admin') {
      return res.render('Login', { error: 'You do not have access to this page. you must be an admin.' });
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
  partialsDir: path.join(__dirname, 'views/Partials'),
  helpers: {
    eq: (a, b) => a == b,
    ifEquals: (a, b, options) => {
      if (a == b) {
        return options.fn(this);  // Render the block if the values are equal
      }
      return options.inverse(this);  // Otherwise, render the inverse block
    },
    lookupCharacter: (characters, id) => {
      // Find the character by the given ID
      return characters.find(character => character.id == id);
    },
// NEW HELPER: Get character image based on level
    getCharacterImage: (character, characterInfo) => {
      if (!characterInfo) {
        console.warn('getCharacterImage: characterInfo is null or undefined', character);
        return '/img/default.png'; // Fallback image
      }

      // Example: Simple evolution based on level
      if (character.level >= 5 && characterInfo.evolutionStage2Image) {
        return characterInfo.evolutionStage2Image;
      } else if (character.level >= 2 && characterInfo.evolutionStage1Image) {
        return characterInfo.evolutionStage1Image;
      } else {
        return characterInfo.baseImage;
      }
    }
  }
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
  const user = req.session.user;

  if (!user) {
    res.locals.user = null;
    return next();
  }

  db.get(
    `SELECT 1 FROM user_roles ur
     JOIN roles r ON ur.roleId = r.id
     WHERE ur.userId = ? AND r.name = 'admin'`,
    [user.id],
    (err, row) => {
      if (err) {
        console.error('Admin role check failed:', err);
      }

      user.isAdmin = !!row;
      res.locals.user = user;
      next();
    }
  );
});

  // Landing Page Route
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/home');
  }

  res.render('LandingPage', { layout: 'landing' });
});


//Home
app.get('/home', requireLogin, (req, res) => {
  const userId = req.session.user.id;

  const xpThreshold = 100; // XP required per level

  db.all(`
    SELECT c.*, ci.baseImage, ci.evolutionStage1Image, ci.evolutionStage2Image
    FROM characters c
    LEFT JOIN character_info ci ON c.characterInfoId = ci.id
    WHERE c.userId = ?
  `, [userId], (err, characters) => {
    if (err) {
      console.error("Error fetching characters with info:", err);
      return res.status(500).send('Error fetching characters');
    }

    if (!characters || characters.length === 0) {
      return res.render('Home', {
        user: req.session.user,
        characters: [],
        tasks: [],
        noCharacter: true,
        pageTitel: 'Home',
        selectedCharacter: null
      });
    }

    const characterId = parseInt(req.query.characterId) || characters[0].id;
    const selectedCharacter = characters.find(c => c.id === characterId);

    if (!selectedCharacter) {
      return res.status(404).send('Character not found');
    }

    db.all('SELECT * FROM tasks WHERE characterId = ? AND pending = 1', [characterId], (err, tasks) => {
      if (err) return res.status(500).send('Error fetching tasks');

      // Calculate XP progress inside the current level
      const totalXp = selectedCharacter.xp;
      const level = selectedCharacter.level;
      const xpForPreviousLevels = (level - 1) * xpThreshold;
      const xpIntoCurrentLevel = totalXp - xpForPreviousLevels;
      const xpToNextLevel = xpThreshold;
      const xpPercentage = Math.min(100, (xpIntoCurrentLevel / xpToNextLevel) * 100);

      res.render('Home', {
        user: req.session.user,
        characters,
        tasks,
        noCharacter: false,
        selectedCharacterId: characterId,
        xp: totalXp,
        level,
        xpIntoCurrentLevel,
        xpToNextLevel,
        xpPercentage,
        selectedCharacter
      });
    });
  });
});

// XP gain route (No direct changes needed here, as it operates on character XP and level)
app.post('/api/gain-xp', (req, res) => {
  const userId = req.session.user?.id;
  const characterId = parseInt(req.body.characterId);
  const xpGained = parseInt(req.body.xpGained);

  if (!userId || isNaN(characterId) || isNaN(xpGained)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.get(
    'SELECT xp FROM characters WHERE id = ? AND userId = ?',
    [characterId, userId],
    (err, character) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!character) return res.status(404).json({ error: 'Character not found' });

      const xpThreshold = 100;
      const totalXp = character.xp + xpGained;
      const newLevel = Math.floor(totalXp / xpThreshold) + 1;

      db.run(
        'UPDATE characters SET xp = ?, level = ? WHERE id = ? AND userId = ?',
        [totalXp, newLevel, characterId, userId],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ error: 'Failed to update XP' });

          res.json({ xp: totalXp, level: newLevel, leveledUp: newLevel > character.level });
        }
      );
    }
  );
});

// Taak voltooien + XP toekennen (No direct changes needed here, as it operates on character XP and level)
app.post('/task/complete/:id', requireLogin, (req, res) => {
  const taskId = req.params.id;
  const characterId = req.query.characterId;

  if (!characterId) return res.status(400).send('characterId ontbreekt');

  db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
    if (err || !task) return res.status(500).send('Taak niet gevonden');

    const taskXp = Number(task.xp) || 0;

    db.get('SELECT * FROM characters WHERE id = ?', [characterId], (err, character) => {
      if (err || !character) return res.status(500).send('Character niet gevonden');

      const userId = character.userId;
      const newXp = (character.xp || 0) + taskXp;
      let newLevel = character.level || 1;
      const requiredXp = 100; // Assuming 100 XP per level for simplicity

      while (newXp >= newLevel * requiredXp) { // This logic also needs to be adjusted based on desired level up curve.
        newLevel++;
      }

      db.run(
        'UPDATE characters SET xp = ?, level = ? WHERE id = ?',
        [newXp, newLevel, characterId],
        function (err) {
          if (err) return res.status(500).send('Update character faalde');

          db.get('SELECT * FROM stats WHERE userId = ?', [userId], (err, stats) => {
            if (err || !stats) {
              console.warn('Stats niet gevonden voor userId:', userId);
              return res.redirect('/home?characterId=' + characterId);
            }

            const updatedTaskCompleted = (stats.taskCompleted || 0) + 1;
            const updatedXp = (stats.totalXpGained || 0) + taskXp;

            // Determen if this task gave the most xp
            const updatedMostXp = Math.max(taskXp, stats.mostXpForOneTask || 0);

            db.run(
              'UPDATE stats SET taskCompleted = ?, totalXpGained = ?, mostXpForOneTask = ? WHERE userId = ?',
              [updatedTaskCompleted, updatedXp, updatedMostXp, userId],
              (err) => {
                if (err) console.error('Fout bij updaten van stats:', err);

                db.run('UPDATE tasks SET pending = 0, completed = 1 WHERE id = ?', [taskId],
                  function (err) {
                    if (err) return res.status(500).send('Taak voltooien faalde');

                    res.redirect('/home?characterId=' + characterId); // Redirect naar de home pagina

                  });
              }
            );
          });
        }
      );
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
    //Render the "Stats" view with stats 
    res.render('Stats', { stats: stat, pageTitel:'Stats'});
  });
});


// Task Manager
app.get('/Taskmanager', requireLogin, (req, res) => {
  const userId = req.session.user.id;
  const today = new Date().toISOString().split('T')[0];
  // Verwijder taken waarvan de dueDate in het verleden ligt
  db.run(`
    DELETE FROM tasks
    WHERE dueDate < date('now')
      AND characterId IN (SELECT id FROM characters WHERE userId = ?)
  `, [userId], (err) => {
    if (err) return res.status(500).send('Fout bij het verwijderen van verlopen taken');

    // Daarna pas: laadt characters en taken
    // IMPORTANT CHANGE: Join with character_info for Taskmanager too, so you can display images
    db.all(`
        SELECT c.*, ci.baseImage, ci.evolutionStage1Image, ci.evolutionStage2Image
        FROM characters c
        LEFT JOIN character_info ci ON c.characterInfoId = ci.id
        WHERE c.userId = ?
    `, [userId], (err, characters) => {
      if (err) return res.status(500).send('Error loading characters');
      if (characters.length === 0) return res.render('Taskmanager', { characters: [], tasks: [], pageTitel: 'Task Manager' });

      const characterIds = characters.map(c => c.id);
      const placeholders = characterIds.map(() => '?').join(',');

      db.all(
        `
        SELECT tasks.*, characters.name AS characterName
        FROM tasks
        JOIN characters ON tasks.characterId = characters.id
        WHERE tasks.characterId IN (${placeholders})
        AND tasks.completed == 0
        `,
        characterIds,
        (err, tasks) => {
          if (err) return res.status(500).send('Error loading tasks');
          res.render('Taskmanager', { characters, tasks, today, pageTitel: 'Task Manager' });
        }
      );
    });
  });
});

// Handle task creation
app.post('/Taskmanager', requireLogin, (req, res) => {
  const { taskName, taskDeadline, taskDescription, characterId, taskXp } = req.body;

db.run(
  `INSERT INTO tasks (title, description, dueDate, completed, characterId, xp) VALUES (?, ?, ?, 0, ?, ?)`,
  [taskName, taskDescription, taskDeadline, characterId, taskXp],
  err => {
    if (err) return res.status(500).send('Error adding task');
    res.redirect('/Taskmanager');
  }
);
});

// Handle task accept
app.post('/task/accept/:id', requireLogin, (req, res) => {
  const taskId = req.params.id;
  const userId = req.session.user.id;

  db.run(`
    UPDATE tasks
    SET pending = 1
    WHERE id = ?
      AND characterId IN (
        SELECT id FROM characters WHERE userId = ?
      )
  `, [taskId, userId], err => {
    if (err) return res.status(500).send('Error accepting task');
    res.redirect('/Taskmanager');
  });
});

app.post('/task/complete/:id', requireLogin, (req, res) => {
  const taskId = req.params.id;

  db.run(
    `UPDATE tasks SET completed = 1, pending  = 0 WHERE id = ?`,
    [taskId],
    function (err) {
      if (err) return res.status(500).send('Error completing task');
      res.redirect('/home');
    }
  );
});

// Handle task delete
app.post('/task/delete/:id', requireLogin, (req, res) => {
  const taskId = req.params.id;
  const userId = req.session.user.id;

  db.run(`
    DELETE FROM tasks
    WHERE id = ?
      AND characterId IN (
        SELECT id FROM characters WHERE userId = ?
      )
  `, [taskId, userId], err => {
    if (err) return res.status(500).send('Error deleting task');
    res.redirect('/Taskmanager');
  });
});


// Login
app.get('/Login', (req, res) => res.render('Login',{pageTitel:'Login'}));

app.post('/Login', (req, res) => {
  const { username, password } = req.body;
  findUser(username, (err, user) => {
    if (err || !user) return res.render('Login', { error: 'Gebruiker niet gevonden.', pageTitel:'Login' });
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) return res.render('Login', { error: 'Wachtwoord incorrect.' });
      req.session.user = user;
      res.redirect('/home');
    });
  });
});

// Create Account
app.get('/CreateAccount', (req, res) => res.render('CreateAccount',{pageTitel:'Create Account'}));

app.post('/CreateAccount', upload.single('profileImage'), (req, res) => {
  const { email, username, password, confirmPassword } = req.body;
  const profileImage = req.file ? `/uploads/${req.file.filename}` : null;

  // Basic password confirmation check
  if (password !== confirmPassword) {
    return res.render('CreateAccount', { error: 'Passwords do not match.' });
  }

  // Password strength check
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
  if (!passwordRegex.test(password)) {
    return res.render('CreateAccount', {
      error: 'Password must be at least 6 characters long and include one uppercase letter, one lowercase letter, and one special character.',
    });
  }

  // Check if username or email already exists
  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
    if (err) {
      return res.render('CreateAccount', { error: 'An error has occurred. Please try again.' });
    }

    if (existingUser) {
      return res.render('CreateAccount', { error: 'Username or e-mail already exists.' });
    }

    // Create user
    createUser(email, username, password, profileImage, (err, userId) => {
      if (err) {
        return res.render('CreateAccount', { error: 'An error occurred while trying to create your account.' });
      }

      db.get('SELECT id FROM roles WHERE name = ?', ['user'], (err, roleRow) => {
        if (err || !roleRow) {
          req.session.user = { id: userId, username, email, profileImage };
          return res.redirect('/CharacterCreation');
        }

        const roleId = roleRow.id;

        db.run('INSERT INTO user_roles (userId, roleId) VALUES (?, ?)', [userId, roleId], (err) => {
          if (err) {
            console.error('Failed to assign role:', err);
          }

          db.run('INSERT INTO stats (userId, username) VALUES (?, ?)', [userId, username], (err) => {
            if (err) {
              console.error("❌ Kon stats niet aanmaken voor nieuwe gebruiker:", err);
            }

            req.session.user = { id: userId, username, email, profileImage };
            res.redirect('/CharacterCreation');
          });
        });
      });
    });
  });
});



// Logout
app.post('/Logout', (req, res) => {
  req.session.destroy(() => res.redirect('/home'));
});

// Admin Panel Route
app.get('/AdminPanel', requireAdmin, (req, res) => {
  db.all(`
    SELECT 
      u.id AS userId, u.username, u.email,
      c.id AS characterId, c.name AS characterName, c.xp AS characterXP,
      t.id AS taskId, t.title AS taskTitle, t.description AS taskDescription,
      t.xp AS taskXP, t.dueDate AS taskDueDate,
      t.pending, t.characterId AS taskCharacterId
    FROM users u
    LEFT JOIN characters c ON c.userId = u.id
    LEFT JOIN tasks t ON t.characterId = c.id AND t.pending = 1
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
        usersMap[row.userId].characters.push({
          id: row.characterId,
          name: row.characterName,
          xp: row.characterXP
        });
      }

      if (row.taskId && !usersMap[row.userId].tasks.find(t => t.id === row.taskId)) {
        usersMap[row.userId].tasks.push({
          id: row.taskId,
          title: row.taskTitle,
          description: row.taskDescription,
          xp: row.taskXP,
          dueDate: row.taskDueDate,
          characterName: row.characterName
        });
      }
    });

    res.render('AdminPanel', { users: Object.values(usersMap), pageTitel:'Admin Panel' });
  });
});


// Change Username
app.post('/admin/change-username', requireAdmin, (req, res) => {
  const { userId, newUsername } = req.body;
  db.run(`UPDATE users SET username = ? WHERE id = ?`, [newUsername, userId], err => {
    if (err) return res.status(500).send('Error updating username');
    res.redirect('/AdminPanel');
  });
});

// Delete User
app.post('/admin/delete-user', requireAdmin, (req, res) => {
  const { userId } = req.body;
  db.run(`DELETE FROM users WHERE id = ?`, [userId], err => {
    if (err) return res.status(500).send('Error deleting user');
    res.redirect('/AdminPanel');
  });
});

// Delete Character
app.post('/admin/delete-character', requireAdmin, (req, res) => {
  const { characterId } = req.body;
  db.run(`DELETE FROM characters WHERE id = ?`, [characterId], err => {
    if (err) return res.status(500).send('Error deleting character');
    res.redirect('/AdminPanel');
  });
});

// Finish Task (mark as completed)
app.post('/admin/finish-task', requireAdmin, (req, res) => {
  const { taskId } = req.body;
db.run(`UPDATE tasks SET pending = 0, completed = 1 WHERE id = ?`, [taskId], err => {
    if (err) return res.status(500).send('Error finishing task');
    res.redirect('/AdminPanel');
  });
});

// Delete Task
app.post('/admin/delete-task', requireAdmin, (req, res) => {
  const { taskId } = req.body;
  db.run(`DELETE FROM tasks WHERE id = ?`, [taskId], err => {
    if (err) return res.status(500).send('Error deleting task');
    res.redirect('/AdminPanel');
  });
});

app.post('/admin/update-character-xp', (req, res) => {
  const characterId = parseInt(req.body.characterId);
  const newTotalXp = parseInt(req.body.newXp);

  if (isNaN(characterId) || isNaN(newTotalXp)) {
    return res.status(400).send('Invalid input');
  }

  const xpThreshold = 100;
  const newLevel = Math.floor(newTotalXp / xpThreshold) + 1;

  db.run(
    'UPDATE characters SET xp = ?, level = ? WHERE id = ?',
    [newTotalXp, newLevel, characterId],
    function (err) {
      if (err) {
        console.error("DB UPDATE error:", err);
        return res.status(500).send('Failed to update XP and level');
      }

      console.log(`Character ${characterId} updated to XP: ${newTotalXp}, Level: ${newLevel}`);
      res.redirect('/adminpanel');
    }
  );
});



  // Focus Mode route
  app.get('/FocusMode', requireLogin, (req, res) => {
    res.render('FocusMode', {pageTitel:'Focus Mode'});
  });

  // Settings route

// Helper functies
function getCharacters(userId, callback) {
  // IMPORTANT CHANGE: Join with character_info here too for settings page if you want to display current images
  db.all(`
    SELECT c.id, c.name, c.level,
           ci.baseImage, ci.evolutionStage1Image, ci.evolutionStage2Image
    FROM characters c
    LEFT JOIN character_info ci ON c.characterInfoId = ci.id
    WHERE c.userId = ?
  `, [userId], (err, characters) => {
    if (err) return callback(err);
    callback(null, characters);
  });
}

function renderSettingsPage(res, user, alert) {
  getCharacters(user.id, (err, characters) => {
    if (err) {
      return res.render('Settings', {
        user,
        characters: [],
        alert: { type: 'error', message: 'Error loading characters' }
      });
    }

    res.render('Settings', {
      user,
      characters,
      alert,
      pageTitel:'Settings'
    });
  });
}

// GET Settings pagina
app.get('/Settings', requireLogin, (req, res) => {
  const user = req.session.user;
  const alert = req.session.alert;
  delete req.session.alert;

  renderSettingsPage(res, user, alert);
});

// Wachtwoord wijzigen
app.post('/Settings/changePassword', requireLogin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.session.user;

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;

  if (!passwordRegex.test(newPassword)) {
    req.session.alert = {
      type: 'error',
      message: 'Password must be at least 6 characters long and include one uppercase letter, one lowercase letter, and one special character.'
    };
    return res.redirect('/Settings');
  }

  findUser(user.username, (err, dbUser) => {
    if (err || !dbUser) {
      req.session.alert = { type: 'error', message: 'User not found' };
      return res.redirect('/Settings');
    }

    bcrypt.compare(currentPassword, dbUser.password, (err, isMatch) => {
      if (err || !isMatch) {
        req.session.alert = { type: 'error', message: 'Incorrect current password' };
        return res.redirect('/Settings');
      }

      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          req.session.alert = { type: 'error', message: 'Error hashing new password' };
          return res.redirect('/Settings');
        }

        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
          if (err) {
            req.session.alert = { type: 'error', message: 'Error updating password' };
            return res.redirect('/Settings');
          }

          req.session.alert = { type: 'success', message: 'Password updated successfully' };
          res.redirect('/Settings');
        });
      });
    });
  });
});

// Account verwijderen
app.post('/Settings/removeAccount', requireLogin, (req, res) => {
  const user = req.session.user;

  db.run(`
    DELETE FROM tasks 
    WHERE characterId IN (
      SELECT id FROM characters WHERE userId = ?
    )
  `, [user.id], (err) => {
    if (err) {
      req.session.alert = { type: 'error', message: 'Error deleting tasks' };
      return res.redirect('/Settings');
    }

    db.run('DELETE FROM characters WHERE userId = ?', [user.id], (err) => {
      if (err) {
        req.session.alert = { type: 'error', message: 'Error deleting characters' };
        return res.redirect('/Settings');
      }

      db.run('DELETE FROM user_roles WHERE userId = ?', [user.id], (err) => {
        if (err) {
          req.session.alert = { type: 'error', message: 'Error deleting user roles' };
          return res.redirect('/Settings');
        }

        db.run('DELETE FROM stats WHERE userId = ?', [user.id], (err) => {
          if (err) {
            req.session.alert = { type: 'error', message: 'Error deleting stats' };
            return res.redirect('/Settings');
          }

          db.run('DELETE FROM users WHERE id = ?', [user.id], (err) => {
            if (err) {
              req.session.alert = { type: 'error', message: 'Error deleting account' };
              return res.redirect('/Settings');
            }

            req.session.destroy(() => {
              res.redirect('/Login');
            });
          });
        });
      });
    });
  });
});

// Character verwijderen
app.post('/Settings/removecharacter', requireLogin, (req, res) => {
  const user = req.session.user;
  const characterId = req.body.characterId;


  // Bekijkt het aantal characters van de gebruiker
 db.get('SELECT COUNT(*) AS count FROM characters WHERE userId = ?', [user.id], (err, row) => {
    if (err) {
      req.session.alert = { type: 'error', message: 'Error checking characters' };
      return res.redirect('/Settings');
    }

    if (row.count <= 1) {
      req.session.alert = { type: 'error', message: 'You must keep at least one character.' };
      return res.redirect('/Settings');
    }


  db.get('SELECT * FROM characters WHERE id = ? AND userId = ?', [characterId, user.id], (err, character) => {
    if (err || !character) {
      req.session.alert = { type: 'error', message: 'Character not found or not yours' };
      return res.redirect('/Settings');
    }

    db.run('DELETE FROM tasks WHERE characterId = ?', [characterId], (err) => {
      if (err) {
        req.session.alert = { type: 'error', message: 'Error deleting tasks' };
        return res.redirect('/Settings');
      }

      db.run('DELETE FROM characters WHERE id = ?', [characterId], (err) => {
        if (err) {
          req.session.alert = { type: 'error', message: 'Error deleting character' };
          return res.redirect('/Settings');
        }

        req.session.alert = { type: 'success', message: 'Character removed successfully' };
        res.redirect('/Settings');
      });
    });
  });
});
});


// Access Rights and Permissions link
app.get('/access-rights', (req, res) => {
  res.redirect('https://en.wikipedia.org/wiki/Access_control');
});

// Leaderboard (Needs join to character_info to get character image for leaderboard display)
app.get('/leaderboard', requireLogin, (req, res) => {
  db.all(`
    SELECT c.name, c.xp, ci.baseImage, ci.evolutionStage1Image, ci.evolutionStage2Image, c.level
    FROM characters c
    LEFT JOIN character_info ci ON c.characterInfoId = ci.id
    ORDER BY c.xp DESC
    LIMIT 10
  `, [], (err, rows) => {
    if (err) {
      console.error("Query error:", err.message);
      return res.status(500).send("Database error");
    }

    // You might want to determine the correct image path for each character here
    // based on their level before passing to the template, or use the helper.
    // For now, the helper 'getCharacterImage' will handle it in the template.

    const top3 = rows.slice(0, 3);
    const others = rows.slice(3);

    res.render('LeaderBoard', { top3, others, pageTitel: 'Leaderboard' });
  });
});


app.post('/admin/delete-user', requireAdmin, (req, res) => {
  const { userId } = req.body;
  db.run(`DELETE FROM users WHERE id = ?`, [userId], err => {
    if (err) return res.status(500).send('Error deleting user');
    res.redirect('/AdminPanel');
  });
});

// Inside your server.js, find a logical place for this.
// For example, you can put it near your other app.get routes like '/Login' or '/CreateAccount'.

// Character Creation GET route (to display the character creation form)
app.get('/CharacterCreation', requireLogin, (req, res) => res.render('CharacterCreation', {pageTitel:'Character Creation'}));

// Character Creation POST (IMPORTANT CHANGES HERE)
app.post('/CharacterCreation', (req, res) => {
  const { name, gender, imagevalue } = req.body; // imagevalue is now the baseImage path
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).send("Unauthorized: You must be logged in.");
  }

  // First, find the characterInfoId based on the selected base image
  getCharacterInfoByBaseImage(imagevalue, (err, characterInfo) => {
    if (err || !characterInfo) {
      console.error('Error fetching character info:', err);
      return res.status(500).json({ success: false, message: 'Selected character image info not found.' });
    }

    const characterInfoId = characterInfo.id;

    // Now insert into the characters table using characterInfoId
    db.run(
      'INSERT INTO characters (userId, name, gender, characterInfoId) VALUES (?, ?, ?, ?)', // Use characterInfoId
      [userId, name, gender, characterInfoId],
      function (err) {
        if (err) {
          console.error('Error during DB insert for character:', err.message);
          return res.status(500).json({ success: false, message: 'Error adding character to the database' });
        }

        // Return success message as JSON
        return res.json({ success: true, message: 'Character created successfully!' });
      }
    );
  });
});

app.get('/profile', requireLogin, (req, res) => {
  const user = req.session.user;

  db.get(`SELECT username, email FROM users WHERE id = ?`, [user.id], (err, row) => {
    if (err) {
      return res.status(500).send('Fout bij ophalen profiel.');
    }

    res.render('Profile', { user: row, });
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

app.get('/reset-password', (req, res) => {
  res.render('reset-password');
});
app.post('/reset-password', (req, res) => {
  const { username, newPassword } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.render('reset-password', { error: 'Databasefout' });
    if (!user) return res.render('reset-password', { error: 'Gebruiker niet gevonden' });

    const hashed = bcrypt.hashSync(newPassword, 10);

    db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id], (err2) => {
      if (err2) {
        return res.render('reset-password', { error: 'Kon wachtwoord niet updaten' });
      }
      res.render('reset-password', { success: 'Wachtwoord succesvol aangepast' });
      res.redirect('/Login?reset=success');
    });
  });
});

app.get('/Classroom', requireLogin, (req, res) => {
  const userId = req.session.user.id;

  // Stap 1: Zoek alle klassen waarin de gebruiker zit
  const klasQuery = `
    SELECT c.id AS classId, c.name AS className, c.code, c.teacherId, u.username AS teacherName
    FROM classes c
    JOIN users u ON c.teacherId = u.id
    JOIN class_users cu ON cu.classId = c.id
    WHERE cu.userId = ?
  `;

  db.all(klasQuery, [userId], (err, classes) => {
    if (err) {
      console.error("❌ Fout bij ophalen van klassen:", err);
      return res.status(500).send("Interne fout bij ophalen van klassen.");
    }

    if (classes.length === 0) {
  return res.render('CreateClassroom', {
    pageTitel: 'Nieuwe Klas Aanmaken',
    message: 'Je zit nog niet in een klas. Maak er een aan!'
  });
}

    // Stap 2: Voor elke klas de leden ophalen met hun personages
    const classIds = classes.map(c => c.classId);

    const memberQuery = `
      SELECT cu.classId, u.id AS userId, u.username, ch.name AS characterName, ch.level, ch.xp
  FROM class_users cu
  JOIN users u ON u.id = cu.userId
  LEFT JOIN (
    SELECT * FROM characters
    WHERE id IN (
      SELECT MAX(id) FROM characters GROUP BY userId
    )
  ) ch ON ch.userId = u.id
  WHERE cu.classId IN (${classIds.map(() => '?').join(',')})
  ORDER BY cu.classId, u.username
    `;

    db.all(memberQuery, classIds, (err, members) => {
      if (err) {
        console.error("❌ Fout bij ophalen van klasleden:", err);
        return res.status(500).send("Fout bij ophalen van klasleden.");
      }

      // Groepeer per klas
      const classData = classes.map(klas => {
    return {
      id: klas.classId,
      name: klas.className,
      code: klas.code,
      teacher: klas.teacherName,
      isTeacher: klas.teacherId === userId, // 👈 toegevoegd veld
      members: members
        .filter(m => m.classId === klas.classId)
        .map(m => ({
          username: m.username,
          character: m.characterName,
          level: m.level,
          xp: m.xp
        }))
    };
  });

  res.render('Classroom', {
    pageTitel: 'Mijn Classroom',
    classes: classData
  });
    });
  });
});
app.post('/Classroom', requireLogin, (req, res) => {
  const userId = req.session.user.id;
  const { name, code } = req.body;

  // ✅ Eerst controleren of er al een klas bestaat met dezelfde NAAM
  const checkQuery = `SELECT * FROM classes WHERE name = ?`;

  db.get(checkQuery, [name], (err, row) => {
    if (err) {
      console.error("❌ Fout bij controleren van klasnaam:", err);
      return res.status(500).send("Interne fout bij controleren van klasnaam.");
    }

    if (row) {
      // ❌ Klasnaam bestaat al, render het formulier opnieuw met foutmelding
      return res.render('CreateClassroom', {
        pageTitel: 'Nieuwe Klas Aanmaken',
        message: `De naam "${name}" is al in gebruik. Kies een andere naam.`,
        name,
        code
      });
    }

    // ✅ Naam bestaat niet, klas toevoegen
    const insertQuery = `INSERT INTO classes (name, code, teacherId) VALUES (?, ?, ?)`;

    db.run(insertQuery, [name, code, userId], function(err) {
      if (err) {
        console.error("❌ Fout bij toevoegen van klas:", err);
        return res.status(500).send("Kon klas niet toevoegen.");
      }

      const classId = this.lastID;

      // Voeg de leraar toe als lid van deze klas
      const insertClassUser = `INSERT INTO class_users (classId, userId) VALUES (?, ?)`;

      db.run(insertClassUser, [classId, userId], (err) => {
        if (err) {
          console.error("❌ Fout bij toevoegen van klas-gebruiker:", err);
          return res.status(500).send("Kon klasgebruikers niet bijwerken.");
        }

        res.redirect('/Classroom');
      });
    });
  });
});
app.post('/Classroom/:id/delete', requireLogin, (req, res) => {
  const classId = req.params.id;
  const userId = req.session.user.id;

  db.get(`SELECT * FROM classes WHERE id = ? AND teacherId = ?`, [classId, userId], (err, row) => {
    if (err) return res.status(500).send("Databasefout.");
    if (!row) return res.status(403).send("Geen toegang.");

    db.run(`DELETE FROM class_users WHERE classId = ?`, [classId], function (err) {
      if (err) return res.status(500).send("Fout bij verwijderen klasgebruikers.");

      db.run(`DELETE FROM classes WHERE id = ?`, [classId], function (err) {
        if (err) return res.status(500).send("Fout bij verwijderen klas.");
        res.redirect('/Classroom');
      });
    });
  });
});


app.get('/joinClassroom', requireLogin, (req, res) => {
  res.render('JoinClassroom', {
    pageTitel: 'Join Classroom',
    message: ''
  });
});

app.post('/joinClassroom', requireLogin, (req, res) => {
  const userId = req.session.user.id;
  const { name, code } = req.body;

  // Zoek classroom met gegeven naam + code
  const query = `SELECT * FROM classes WHERE name = ? AND code = ?`;

  db.get(query, [name, code], (err, classroom) => {
    if (err) {
      console.error("❌ Fout bij zoeken classroom:", err);
      return res.status(500).send("Interne fout.");
    }

    if (!classroom) {
      // Geen klas gevonden met die naam + code
      return res.render('JoinClassroom', {
        pageTitel: 'Join Classroom',
        message: 'Geen classroom gevonden met deze naam en code.',
        name,
        code
      });
    }

    // Check of gebruiker al in die klas zit
    const checkUserInClass = `SELECT * FROM class_users WHERE classId = ? AND userId = ?`;

    db.get(checkUserInClass, [classroom.id, userId], (err, row) => {
      if (err) {
        console.error("❌ Fout bij checken klaslid:", err);
        return res.status(500).send("Interne fout.");
      }

      if (row) {
        // Gebruiker zit al in de klas
        return res.redirect('/Classroom'); // of een melding tonen
      }

      // Voeg gebruiker toe aan klas
      const insertUser = `INSERT INTO class_users (classId, userId) VALUES (?, ?)`;

      db.run(insertUser, [classroom.id, userId], (err) => {
        if (err) {
          console.error("❌ Fout bij toevoegen aan klas:", err);
          return res.status(500).send("Interne fout.");
        }

        res.redirect('/Classroom');
      });
    });
  });
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});