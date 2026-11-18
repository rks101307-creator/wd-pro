// Small helpers shared by all route files.
const isDate = s => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const date = new Date(s + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s;
};
// Use the user's calendar day for this India-focused app, even when Node runs in UTC.
const today = () => {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(x => x.type === type).value;
  return part('year') + '-' + part('month') + '-' + part('day');
};
const bad = msg => Object.assign(new Error(msg), { status: 400 });  // creates a "bad request" error
module.exports = { isDate, today, bad };
