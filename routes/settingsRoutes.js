// Backup, export, import and clear-all-data.
const express = require('express');
const fs = require('fs');
const path = require('path');
const storage = require('../services/storageService');
const router = express.Router();
const FILES = ['profile', 'meals', 'water', 'exercise_log', 'sleep_log', 'food_database', 'exercises'];

function snapshot() { const out = {}; FILES.forEach(f => out[f] = storage.read(f)); return out; }

router.get('/settings/export', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="nutritrack-backup.json"');
  res.json(snapshot());
});

// Saves a copy inside database/backups/ on your computer.
router.post('/settings/backup', (req, res) => {
  const dir = path.join(__dirname, '..', 'database', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const name = 'backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  fs.writeFileSync(path.join(dir, name), JSON.stringify(snapshot(), null, 2));
  res.json({ file: 'database/backups/' + name });
});

router.post('/settings/import', (req, res) => {
  const data = req.body || {};
  const found = FILES.filter(f => data[f] !== undefined);
  if (!found.length) return res.status(400).json({ error: 'This does not look like a NutriTrack backup file' });
  for (const f of found) {                       // check the shapes first, so a bad file changes nothing
    const shouldBeObject = f === 'profile';
    if (shouldBeObject ? (typeof data[f] !== 'object' || Array.isArray(data[f])) : !Array.isArray(data[f])) return res.status(400).json({ error: 'Backup file is damaged: ' + f });
  }
  found.forEach(f => storage.write(f, data[f]));
  res.json({ imported: found });
});

// Needs { confirm: "DELETE" } so it cannot happen by accident.
router.delete('/settings/clear', (req, res) => {
  if (req.body?.confirm !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm' });
  ['meals', 'water', 'exercise_log', 'sleep_log'].forEach(f => storage.write(f, []));
  fs.rmSync(path.join(__dirname, '..', 'database', 'profile.json'), { force: true });   // profile resets to defaults on next read
  res.json({ ok: true });
});
module.exports = router;
