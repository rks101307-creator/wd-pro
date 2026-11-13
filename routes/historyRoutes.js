// History: past meals + exercise, filtered by date, month, meal type or text.
const express = require('express');
const storage = require('../services/storageService');
const nutrition = require('../services/nutritionService');
const { isDate, bad } = require('../services/helpers');
const router = express.Router();

// GET /api/history?month=2026-11  or  ?date=2026-11-10   (optional: &type=lunch&q=roti)
router.get('/history', (req, res) => {
  const { month, date, type, q } = req.query;
  if (date && !isDate(date)) throw bad('Invalid date');
  const search = (q || '').toLowerCase();
  let meals = storage.read('meals');
  if (date) meals = meals.filter(m => m.date === date);
  else if (month) meals = meals.filter(m => m.date.startsWith(month));
  if (type) meals = meals.filter(m => m.mealType === type);
  if (search) meals = meals.filter(m => m.name.toLowerCase().includes(search));
  const exercise = storage.read('exercise_log').filter(e => (date ? e.date === date : month ? e.date.startsWith(month) : true));
  const sleep = storage.read('sleep_log').filter(e => (date ? e.date === date : month ? e.date.startsWith(month) : true));
  // group meals by date and add the totals of each day
  const days = {};
  const day = date => days[date] = days[date] || { date, meals: [], exercise: [], sleep: [] };
  meals.forEach(m => day(m.date).meals.push({ ...m, totals: nutrition.mealTotals(m) }));
  exercise.forEach(e => day(e.date).exercise.push(e));
  sleep.forEach(s => day(s.date).sleep.push(s));
  const list = Object.values(days).map(d => ({ ...d, totals: nutrition.sum(d.meals) })).sort((a, b) => b.date.localeCompare(a.date));
  res.json(list);
});
module.exports = router;
