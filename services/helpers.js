// Small helpers shared by all route files.
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');           // checks "2026-11-10" format
const today = () => new Date().toISOString().slice(0, 10);          // today's date as text
const bad = msg => Object.assign(new Error(msg), { status: 400 });  // creates a "bad request" error
module.exports = { isDate, today, bad };
