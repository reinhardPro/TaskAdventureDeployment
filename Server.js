const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');

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

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Home route
app.get('/', (req, res) => {
  res.render('home');
});

// Stats
app.get("/Stats", (req, res) => {
  res.render("Stats");
});

// Login
app.get("/Login", (req, res) => {
  res.render("Login");
});

// Create Account
app.get("/CreateAccount", (req, res) => {
  res.render("create_character", {camps});
});

// Focus Mode
app.get("/FocusMode", (req, res) => {
  res.render("FocusMode");
});

// Settings
app.get("/Settings", (req, res) => {
  res.render("Settings");
});

// Leaderboard
app.get("/Leaderboard", (req, res) => {
  res.render("Leaderboard");
});

//Character Creation
app.get("/CharacterCreation", (req, res) => {
  res.render("CharacterCreation");
});


// Custom 404 page
app.use((req, res) => {
  res.render("errors/404");
});

// Custom 500 page
app.use((err, req, res, next) => {
  console.error(err.message);
  res.render("errors/500");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
