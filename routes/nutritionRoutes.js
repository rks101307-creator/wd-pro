// Totals for one day, the last 7 days, or any date range (used by charts), plus water logging.
const express = require('express');
const { v4: uuid } = require('uuid');
const storage = require('../services/storageService');
const nutrition = require('../services/nutritionService');
const { isDate, today, bad } = require('../services/helpers');
const router = express.Router();

router.get('/nutrition/daily', (req, res) => {
  const d = req.query.date || today();
  if (!isDate(d)) throw bad('Invalid date');
  res.json(nutrition.daily(d));
});
router.get('/nutrition/weekly', (req, res) => {
  const d = req.query.end || today();
  if (!isDate(d)) throw bad('Invalid date');
  res.json(nutrition.weekly(d));
});
// /nutrition/range?days=30  -> last 30 days (max 90)
router.get('/nutrition/range', (req, res) => {
  const days = Math.min(90, Math.max(1, +req.query.days || 30));
  res.json(nutrition.range(today(), days));
});
router.post('/water', (req, res) => {
  const ml = +req.body?.ml;
  if (!(ml > 0 && ml <= 2000)) throw bad('Water amount must be between 1 and 2000 ml');
  const w = storage.read('water');
  w.push({ id: uuid(), date: isDate(req.body.date) ? req.body.date : today(), ml });
  storage.write('water', w);
  res.status(201).json({ ok: true });
});
module.exports = router;
