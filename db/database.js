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
      password TEXT NOT NULL
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


  // Dummy users (met email, username, password)
  const users = [
    ['alice@example.com', 'alice', 'password123'],
    ['bob@example.com', 'bob', 'password123'],
    ['carol@example.com', 'carol', 'password123'],
    ['dave@example.com', 'dave', 'password123'],
    ['eve@example.com', 'eve', 'password123']
  ];

  db.run(`DELETE FROM users`);
  const userStmt = db.prepare("INSERT INTO users (email, username, password) VALUES (?, ?, ?)");
  users.forEach(([email, username, password]) => {
    const hashed = bcrypt.hashSync(password, 10);
    userStmt.run(email, username, hashed);
  });
  userStmt.finalize();

  // Dummy characters
const characters = [
  [1, 'ShadowBlade', 4, 950, 1,'/img/pixelFemale.png'],
  [2, 'IronFist', 6, 1400, 0,'/img/purpleguy.png'],
  [3, 'WindRunner', 2, 450, 0,'/img/torkoal.png'],
  [4, 'FireMage', 7, 1900, 1,'/img/goku.png'],
  [5, 'NightElf', 5, 1200, 1,'/img/purpleguy.png'],
  [6, 'DarkElf', 3, 700, 1,'/img/malePixel.png'],
  [7, 'SpingBing', 10, 2500, 0,'/img/purpleguy.png'],
  [8, 'Logan', 8, 2000, 0,'/img/purpleguy.png'],
  [9, 'CumMaster', 9, 2300, 1,'/img/purpleguy.png']
];
// --- Create default roles (admin, user, guest) ---

db.all(`SELECT name FROM roles WHERE name IN ('admin', 'user', 'guest')`, (err, rows) => {
  const existingRoles = rows.map(r => r.name);
  if (!existingRoles.includes('admin')) db.run(`INSERT INTO roles (name) VALUES ('admin')`);
  if (!existingRoles.includes('user')) db.run(`INSERT INTO roles (name) VALUES ('user')`);
  if (!existingRoles.includes('guest')) db.run(`INSERT INTO roles (name) VALUES ('guest')`);
});

// --- Create the admin user if it doesn't exist ---
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
        console.log("✅ Admin user created!");

        db.get(`SELECT id FROM roles WHERE name = 'admin'`, (err, role) => {
          if (err || !role) {
            console.error("Error retrieving admin role:", err);
            return;
          }

          db.run(
            `INSERT OR IGNORE INTO user_roles (userId, roleId) VALUES (?, ?)`,
            [userId, role.id],
            (err) => {
              if (err) {
                console.error("Error assigning admin role:", err);
                return;
              }
              console.log("✅ Admin role assigned!");
            }
          );
        });
      }
    );
  } else {
    console.log("✅ Admin user already exists!");
  }
});


  db.run(`DELETE FROM characters`);
  characters.forEach(([userId, name, level, xp, gender, imagevalue]) => {
    db.run(
      "INSERT INTO characters (userId, name, level, xp, gender, imagevalue) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, name, level, xp, gender, imagevalue]
    );
  });
  // charStmt.finalize();

  // Dummy tasks
  // const tasks = [
  //   [1, 'Craft a Sword', 'Gather iron and craft a new sword.', '2025-05-10', 0],
  //   [2, 'Scout the Area', 'Explore the nearby forest for enemies.', '2025-05-12', 1],
  //   [3, 'Deliver Message', 'Take the letter to the capital.', '2025-05-15', 0],
  //   [4, 'Defend the Wall', 'Hold the wall from invading forces.', '2025-05-20', 0],
  //   [5, 'Collect Taxes', 'Visit villagers and collect taxes.', '2025-05-18', 1]
  // ];

  // db.run(`DELETE FROM tasks`);
  // const taskStmt = db.prepare("INSERT INTO tasks (userId, title, description, dueDate, completed) VALUES (?, ?, ?, ?, ?)");
  // tasks.forEach(task => taskStmt.run(...task));
  // taskStmt.finalize();

  // console.log("✅ Dummy users, characters en tasks succesvol toegevoegd!");
});
//Dummy stats
  const stats = [
    [1, 'alice', 3, 7, 950, 6, 400, 2, 1, 0],
    [2, 'bob', 6, 4, 1400, 19, 500, 3, 1, 0],
    [3, 'carol', 1, 9, 450, 9, 55, 1, 4, 0],
    [4, 'dave', 5, 5, 1900, 5, 500, 2, 3, 0],
    [5, 'eve', 4, 6, 1200, 14, 650, 3, 2, 0],
  ];
  db.run(`DELETE FROM stats`);
  stats.forEach(([userId, username, taskCompleted, taskFailed, totalXpGained, friends, mostXpForOneTask, mostTaskIn24h, dailyStreak, timeSpentOnTasks]) => {
    db.run(
      "INSERT INTO stats (userId, username, taskCompleted, taskFailed, totalXpGained, friends, mostXpForOneTask, mostTaskIn24h, dailyStreak, timeSpentOnTasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, username, taskCompleted, taskFailed, totalXpGained, friends, mostXpForOneTask, mostTaskIn24h, dailyStreak, timeSpentOnTasks]
    );
  });



// Gebruikersfuncties blijven ongewijzigd
function createUser(email, username, password, callback) {
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return callback(err);
    db.run(
      `INSERT INTO users (email, username, password) VALUES (?, ?, ?)`,
      [email, username, hashedPassword],
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
