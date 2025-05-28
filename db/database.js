const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./TAdatabase.db');

db.serialize(() => {
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      profileImage TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      characterId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      dueDate TEXT NOT NULL,
      Pending INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      FOREIGN KEY (characterId) REFERENCES characters(id)

    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      gender INTEGER DEFAULT 0,
      imagevalue TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);
  
  
  db.run(`
    CREATE TABLE IF NOT EXISTS levelup (
      level INTEGER PRIMARY KEY,
      required_xp INTEGER NOT NULL
    )
  `);

  // Leaderboard table
  db.run(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      characterId INTEGER NOT NULL,
      rank INTEGER,
      FOREIGN KEY(characterId) REFERENCES characters(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      roleId INTEGER NOT NULL,
      permissionId INTEGER NOT NULL,
      FOREIGN KEY(roleId) REFERENCES roles(id),
      FOREIGN KEY(permissionId) REFERENCES permissions(id),
      PRIMARY KEY (roleId, permissionId)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_roles (
      userId INTEGER NOT NULL,
      roleId INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roleId) REFERENCES roles(id),
      PRIMARY KEY (userId, roleId)
    )
  `);

//stats table
db.run(`
  CREATE TABLE IF NOT EXISTS stats (
    userId INTEGER NOT NULL,
    username TEXT UNIQUE NOT NULL,
    taskCompleted INTEGER DEFAULT 0,
    taskFailed INTEGER DEFAULT 0,
    totalXpGained INTEGER DEFAULT 0,
    friends INTEGER DEFAULT 0,
    mostXpForOneTask INTEGER DEFAULT 0,
    mostTaskIn24h INTEGER DEFAULT 0,
    dailyStreak INTEGER DEFAULT 0,
    timeSpentOnTasks INTERGER DEFAULT 0,
    FOREIGN KEY(username) REFERENCES users(name)
  );
`);


  // Standaardrollen toevoegen indien nodig
  db.all(`SELECT name FROM roles WHERE name IN ('admin', 'user', 'guest')`, (err, rows) => {
    const existingRoles = rows.map(r => r.name);
    if (!existingRoles.includes('admin')) db.run(`INSERT INTO roles (name) VALUES ('admin')`);
    if (!existingRoles.includes('user')) db.run(`INSERT INTO roles (name) VALUES ('user')`);
    if (!existingRoles.includes('guest')) db.run(`INSERT INTO roles (name) VALUES ('guest')`);
  });

  // Admin-gebruiker aanmaken als die nog niet bestaat
  db.get(`SELECT * FROM users WHERE username = 'admin'`, (err, user) => {
    if (err) {
      console.error("Error checking for admin user:", err);
      return;
    }
    if (!user) {
      const hashedPassword = bcrypt.hashSync('admin', 10);
      db.run(
        `INSERT INTO users (email, username, password) VALUES (?, ?, ?)`,
        ['admin@example.com', 'admin', hashedPassword],
        function (err) {
          if (err) {
            console.error("Error creating admin user:", err);
            return;
          }
          const userId = this.lastID;
          db.run(
            `INSERT INTO stats (userId, username) VALUES (?, ?)`,
            [userId, 'admin'],
            (err) => {
              if (err) console.error("❌ Kon stats niet aanmaken voor admin:", err);
            }
          );
          db.get(`SELECT id FROM roles WHERE name = 'admin'`, (err, role) => {
            if (!err && role) {
              db.run(
                `INSERT OR IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)`,
                [userId, role.id]
              );
            }
          });
        }
      );
    }
  });
});

// Gebruikersfuncties
function createUser(email, username, password, profileImage, callback) {
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return callback(err);
    db.run(
      `INSERT INTO users (email, username, password, profileImage) VALUES (?, ?, ?, ?)`,
      [email, username, hashedPassword, profileImage],
      function (err) {
        callback(err, this.lastID);
      }
    );
  });
}

function findUser(usernameOrEmail, callback) {
  db.get(
    `SELECT * FROM users WHERE username = ? OR email = ?`,
    [usernameOrEmail, usernameOrEmail],
    (err, row) => {
      callback(err, row);
    }
  );
}

function getTasks(userId, callback) {
  db.all(
    `SELECT * FROM tasks WHERE userId = ?`,
    [userId],
    (err, tasks) => {
      callback(err, tasks);
    }
  );
}

module.exports = { db, createUser, findUser, getTasks };