const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Initialize the database with the Users table
const db = new sqlite3.Database('./TAdatabase.db');

// Initialize the database with a users table if it doesn't exist
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Tasks table
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      dueDate TEXT,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  // Characters table
  db.run(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  // LevelUp table
  db.run(`
    CREATE TABLE IF NOT EXISTS levelup (
      level INTEGER PRIMARY KEY,
      required_xp INTEGER NOT NULL
    )
  `);

  // Leaderboard table (could be a view in real-world case)
  db.run(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      characterId INTEGER NOT NULL,
      rank INTEGER,
      FOREIGN KEY(characterId) REFERENCES characters(id)
    )
  `);

  // Roles table
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  // Permissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  // RolePermissions mapping table (many-to-many)
  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      roleId INTEGER NOT NULL,
      permissionId INTEGER NOT NULL,
      FOREIGN KEY(roleId) REFERENCES roles(id),
      FOREIGN KEY(permissionId) REFERENCES permissions(id),
      PRIMARY KEY (roleId, permissionId)
    )
  `);

  // UserRoles mapping table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_roles (
      userId INTEGER NOT NULL,
      roleId INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roleId) REFERENCES roles(id),
      PRIMARY KEY (userId, roleId)
    )
  `);
});

// Function to insert a new user into the database
function createUser(email, username, password, callback) {
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return callback(err);
    db.run(
      `INSERT INTO users (email, username, password) VALUES (?, ?, ?)`,
      [email, username, hashedPassword],
      function (err) {
        callback(err, this.lastID); // Return the new user ID
      }
    );
  });
}

// Function to find a user by username/email and compare the password
function findUser(usernameOrEmail, callback) {
  db.get(
    `SELECT * FROM users WHERE username = ? OR email = ?`,
    [usernameOrEmail, usernameOrEmail],
    (err, row) => {
      callback(err, row); // Return the user row
    }
  );
}

module.exports = { createUser, findUser };
