// Profile + daily goals + food preferences.
const express = require('express');
const storage = require('../services/storageService');
const { num } = require('../services/nutritionService');
const router = express.Router();

router.get('/', (req, res) => res.json(storage.read('profile')));

router.put('/', (req, res) => {
  const p = storage.read('profile'), b = req.body || {};
  if (typeof b.name === 'string') p.name = b.name.trim().slice(0, 60);
  if (typeof b.preferences === 'string') p.preferences = b.preferences.slice(0, 500);
  if (b.age !== undefined) p.age = num(b.age) || null;
  ['calorieGoal', 'proteinGoal', 'carbsGoal', 'fatGoal', 'fiberGoal', 'waterGoal'].forEach(k => { if (b[k] !== undefined) p[k] = num(b[k]) || p[k]; });
  storage.write('profile', p);
  res.json(p);
});
module.exports = router;
