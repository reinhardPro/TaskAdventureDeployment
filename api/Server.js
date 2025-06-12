// server.js
import express from 'express';
import { engine as exphbsEngine } from 'express-handlebars';
import path from 'path';
import session from 'express-session';
import bcrypt from 'bcrypt';
// import multer from 'multer'; // Uncomment if you re-introduce multer

import { db, createUser, findUser, getTasks, getCharacterInfoByBaseImage } from '../db/database.js'; // Ensure database.js is also an ES Module or handle carefully

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

app.engine('hbs', exphbsEngine({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/Layouts'),
  partialsDir: path.join(__dirname, 'views/Partials'),
  helpers: {
    eq: (a, b) => a == b,
    ifEquals: (a, b, options) => {
      if (a == b) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
    lookupCharacter: (characters, id) => {
      return characters.find(character => character.id == id);
    },

    getCharacterImage: (character, characterInfo) => {
      if (!characterInfo) {
        console.warn('getCharacterImage: characterInfo is null or undefined', character);
        return '/img/default.png';
      }

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
    secure: false,
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
function calculateLevelAndXpProgress(totalXp) {
  let level = 1;
  let xpForNextLevel = 100;
  let remainingXp = totalXp;

  while (remainingXp >= xpForNextLevel) {
    remainingXp -= xpForNextLevel;
    level++;
    xpForNextLevel = 100 + (level - 1) * 50;
  }

  return {
    level,
    xpIntoCurrentLevel: remainingXp,
    xpToNextLevel: xpForNextLevel
  };
}

app.get('/home', requireLogin, (req, res) => {
  const userId = req.session.user.id;

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

      const totalXp = selectedCharacter.xp;
      const level = selectedCharacter.level;
      const { xpIntoCurrentLevel, xpToNextLevel } = calculateLevelAndXpProgress(totalXp);
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
        selectedCharacter,
        pageTitel: 'Home'
      });
    });
  });
});

// XP gain route
app.post('/api/gain-xp', (req, res) => {
  const userId = req.session.user?.id;
  const characterId = parseInt(req.body.characterId);
  const xpGained = parseInt(req.body.xpGained);

  if (!userId || isNaN(characterId) || isNaN(xpGained)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  db.get(
    'SELECT xp, level FROM characters WHERE id = ? AND userId = ?',
    [characterId, userId],
    (err, character) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!character) return res.status(404).json({ error: 'Character not found' });

      const oldLevel = character.level;
      const totalXp = character.xp + xpGained;
      const { level: newLevel } = calculateLevelAndXpProgress(totalXp);

      db.run(
        'UPDATE characters SET xp = ?, level = ? WHERE id = ? AND userId = ?',
        [totalXp, newLevel, characterId, userId],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ error: 'Failed to update XP' });

          res.json({ xp: totalXp, level: newLevel, leveledUp: newLevel > oldLevel });
        }
      );
    }
  );
});

// complete task
app.post('/task/complete/:id', requireLogin, (req, res) => {
  const taskId = req.params.id;
  const characterId = req.query.characterId;

  if (!characterId) return res.status(400).send('characterId is missing');

  db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
    if (err || !task) return res.status(500).send('Task not found');

    const taskXp = Number(task.xp) || 0;

    db.get('SELECT * FROM characters WHERE id = ?', [characterId], (err, character) => {
      if (err || !character) return res.status(500).send('Character not found');

      const userId = character.userId;
      const newXp = (character.xp || 0) + taskXp;
      let newLevel = calculateLevelAndXpProgress(newXp).level;

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

            const updatedMostXp = Math.max(taskXp, stats.mostXpForOneTask || 0);

            db.run(
              'UPDATE stats SET taskCompleted = ?, totalXpGained = ?, mostXpForOneTask = ? WHERE userId = ?',
              [updatedTaskCompleted, updatedXp, updatedMostXp, userId],
              (err) => {
                if (err) console.error('Fout bij updaten van stats:', err);

                db.run('UPDATE tasks SET pending = 0, completed = 1 WHERE id = ?', [taskId],
                  function (err) {
                    if (err) return res.status(500).send('Taak voltooien faalde');

                    res.redirect('/home?characterId=' + characterId);

                  });
              }
            );
          });
        }
      );
    });
  });
});

module.exports = app;
api/Server.js

//"fert"