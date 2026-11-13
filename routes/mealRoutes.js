// Meals (add / edit / delete) and the food database (search / add custom food).
const express = require('express');
const { v4: uuid } = require('uuid');
const storage = require('../services/storageService');
const nutrition = require('../services/nutritionService');
const { isDate, today, bad } = require('../services/helpers');
const router = express.Router();
const TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

router.get('/foods', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  res.json(storage.read('food_database').filter(f => f.name.toLowerCase().includes(q)).slice(0, 50));
});

router.post('/foods', (req, res) => {
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) throw bad('Food name is required');
  const food = { id: uuid(), name: String(b.name).trim().slice(0, 80), serving: String(b.serving || '1 serving').slice(0, 40), per: nutrition.cleanNutrition(b.per), custom: true };
  const foods = storage.read('food_database');
  foods.push(food);
  storage.write('food_database', foods);
  res.status(201).json(food);
});

router.get('/meals', (req, res) => {
  const date = req.query.date || today();
  if (!isDate(date)) throw bad('Invalid date');
  res.json(storage.read('meals').filter(m => m.date === date).map(m => ({ ...m, totals: nutrition.mealTotals(m) })));
});

router.post('/meals', (req, res) => {
  const b = req.body || {};
  if (!b.name) throw bad('Meal name is required');
  if (!TYPES.includes(b.mealType)) throw bad('Meal type must be one of: ' + TYPES.join(', '));
  if (!(+b.quantity > 0)) throw bad('Quantity must be greater than 0');
  const meal = { id: uuid(), date: isDate(b.date) ? b.date : today(), mealType: b.mealType, name: String(b.name).slice(0, 80), serving: String(b.serving || '1 serving').slice(0, 40), quantity: +b.quantity, per: nutrition.cleanNutrition(b.per), estimate: true };
  const meals = storage.read('meals');
  meals.push(meal);
  storage.write('meals', meals);
  res.status(201).json(meal);
});

router.put('/meals/:id', (req, res) => {
  const meals = storage.read('meals'), i = meals.findIndex(m => m.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Meal not found' });
  const b = req.body || {};
  if (b.quantity !== undefined) { if (!(+b.quantity > 0)) throw bad('Quantity must be greater than 0'); meals[i].quantity = +b.quantity; }
  if (b.mealType !== undefined) { if (!TYPES.includes(b.mealType)) throw bad('Invalid meal type'); meals[i].mealType = b.mealType; }
  if (b.per) meals[i].per = nutrition.cleanNutrition(b.per);
  storage.write('meals', meals);
  res.json(meals[i]);
});

router.delete('/meals/:id', (req, res) => {
  const meals = storage.read('meals'), left = meals.filter(m => m.id !== req.params.id);
  if (left.length === meals.length) return res.status(404).json({ error: 'Meal not found' });
  storage.write('meals', left);
  res.json({ ok: true });
});
module.exports = router;
