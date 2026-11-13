// Starts the web server. Run it with:  npm start
require('dotenv').config();                       // loads your .env file (API key etc.)
const express = require('express');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const app = express();

app.use(express.json({ limit: '8mb' }));           // 8mb so food photos can be sent

// Lets pages opened by double-clicking an .html file (origin "null") or from localhost use the API.
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin === 'null' || (origin && origin.startsWith('http://localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Each file in routes/ handles one area of the app.
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api', require('./routes/mealRoutes'));
app.use('/api', require('./routes/nutritionRoutes'));
app.use('/api', require('./routes/aiRoutes'));
app.use('/api', require('./routes/exerciseRoutes'));
app.use('/api', require('./routes/historyRoutes'));
app.use('/api', require('./routes/settingsRoutes'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route' }));

app.use(express.static(path.join(__dirname, 'public')));   // serves the pages in public/
app.get('/', (req, res) => res.redirect('/dashboard.html'));
app.use(errorHandler);                                       // must be last

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('NutriTrack AI running at http://localhost:' + port));
