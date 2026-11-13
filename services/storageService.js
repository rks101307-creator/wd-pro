// Safe JSON file storage: reads tolerate missing/corrupt files, writes are atomic (temp file + rename).
const fs = require('fs');
const path = require('path');
const DB = path.join(__dirname, '..', 'database');
const defaults = { profile: {name:'', age:null, calorieGoal:2000, proteinGoal:60, carbsGoal:250, fatGoal:65, fiberGoal:25, waterGoal:2500, preferences:''}, meals: [], water: [], exercise_log: [], sleep_log: [] };

function read(name) {
  const file = path.join(DB, name + '.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) {
    if (e.code !== 'ENOENT') fs.copyFileSync(file, file + '.corrupt-' + Date.now()); // keep bad file, never lose data
    const d = JSON.parse(JSON.stringify(defaults[name] ?? [])); write(name, d); return d;
  }
}
function write(name, data) {
  fs.mkdirSync(DB, { recursive: true });
  const file = path.join(DB, name + '.json'), tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}
module.exports = { read, write };
