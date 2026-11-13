const storage = require('./storageService');
const KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
const num = v => (Number.isFinite(+v) && +v >= 0 ? +v : 0);

function cleanNutrition(n = {}) { const o = {}; KEYS.forEach(k => o[k] = num(n[k])); return o; }
function mealTotals(m) { const o = {}; KEYS.forEach(k => o[k] = Math.round(num(m.per?.[k]) * num(m.quantity) * 10) / 10); return o; }
function sum(meals) {
  const t = Object.fromEntries(KEYS.map(k => [k, 0]));
  meals.forEach(m => { const x = mealTotals(m); KEYS.forEach(k => t[k] += x[k]); });
  KEYS.forEach(k => t[k] = Math.round(t[k] * 10) / 10); return t;
}
function daily(date) {
  const meals = storage.read('meals').filter(m => m.date === date);
  const water = storage.read('water').filter(w => w.date === date).reduce((a, w) => a + num(w.ml), 0);
  return { date, totals: sum(meals), water, mealCount: meals.length };
}
// Totals for each of the last `days` days ending on endDate.
function range(endDate, days) {
  const out = [], end = new Date(endDate + 'T00:00:00Z');
  for (let i = days - 1; i >= 0; i--) { const d = new Date(end); d.setUTCDate(d.getUTCDate() - i); out.push(daily(d.toISOString().slice(0, 10))); }
  return out;
}
const weekly = endDate => range(endDate, 7);
module.exports = { cleanNutrition, mealTotals, sum, daily, weekly, range, num };
