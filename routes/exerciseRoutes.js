// Exercise library + logging completed activity.
const express = require('express');
const { v4: uuid } = require('uuid');
const storage = require('../services/storageService');
const { isDate, today, bad } = require('../services/helpers');
const router = express.Router();

router.get('/exercises', (req, res) => res.json(storage.read('exercises')));

router.get('/health/sleep', (req, res) => {
  const days = Math.min(90, Math.max(1, +req.query.days || 14));
  const since = new Date(); since.setDate(since.getDate() - days);
  res.json(storage.read('sleep_log').filter(x => x.date >= since.toISOString().slice(0, 10)).sort((a, b) => b.date.localeCompare(a.date)));
});

router.post('/health/sleep', (req, res) => {
  const b = req.body || {}, hours = +b.hours, quality = +b.quality;
  if (!(hours > 0 && hours <= 24)) throw bad('Sleep duration must be between 0 and 24 hours');
  if (!(quality >= 1 && quality <= 5)) throw bad('Choose a sleep quality from 1 to 5');
  const entry = { id: uuid(), date: isDate(b.date) ? b.date : today(), hours, quality, source: b.source === 'watch' ? 'watch' : 'manual' };
  const rows = storage.read('sleep_log'); rows.push(entry); storage.write('sleep_log', rows);
  res.status(201).json(entry);
});

router.get('/exercises/log', (req, res) => {
  const days = Math.min(90, +req.query.days || 7), since = new Date(); since.setDate(since.getDate() - days);
  res.json(storage.read('exercise_log').filter(e => e.date >= since.toISOString().slice(0, 10)));
});

router.post('/exercises/log', (req, res) => {
  const b = req.body || {}, lib = storage.read('exercises').find(x => x.id === b.exerciseId);
  const customName = String(b.name || '').trim().slice(0, 100);
  if (!lib && !customName) throw bad('Choose an exercise from the library or enter an activity name');
  if (!(+b.minutes > 0 && +b.minutes <= 300)) throw bad('Minutes must be between 1 and 300');
  const distanceKm = b.distanceKm === undefined || b.distanceKm === '' ? null : +b.distanceKm;
  if (distanceKm !== null && !(Number.isFinite(distanceKm) && distanceKm > 0 && distanceKm <= 2000)) throw bad('Distance must be between 0 and 2000 km');
  const entry = { id: uuid(), date: isDate(b.date) ? b.date : today(), exerciseId: lib?.id || 'manual', name: lib?.name || customName, minutes: +b.minutes, source: b.source === 'watch' ? 'watch' : 'manual' };
  if (distanceKm) entry.distanceKm = distanceKm;
  if (b.route) entry.route = String(b.route).trim().slice(0, 160);
  const log = storage.read('exercise_log');
  log.push(entry);
  storage.write('exercise_log', log);
  res.status(201).json(entry);
});

router.delete('/exercises/log/:id', (req, res) => {
  const log = storage.read('exercise_log'), left = log.filter(e => e.id !== req.params.id);
  if (left.length === log.length) return res.status(404).json({ error: 'Entry not found' });
  storage.write('exercise_log', left);
  res.json({ ok: true });
});
module.exports = router;
