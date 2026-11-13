// Dashboard page: loads today's totals, meals, weekly chart, water and the AI insight from the server.
buildShell('dashboard');
let chart;
async function load() {
  const day = todayStr(), [profile, d, meals, week] = await Promise.all([api('/profile'), api('/nutrition/daily?date=' + day), api('/meals?date=' + day), api('/nutrition/weekly?end=' + day)]);
  const h = new Date().getHours();
  $('#hello').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (profile.name ? ', ' + profile.name : '');
  $('#date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const t = d.totals, rows = [['Calories', t.calories, profile.calorieGoal, 'kcal'], ['Protein', t.protein, profile.proteinGoal, 'g'], ['Carbs', t.carbs, profile.carbsGoal, 'g'], ['Fat', t.fat, profile.fatGoal, 'g']];
  $('#stats').innerHTML = rows.map(([n, v, g, u]) => '<div class="card stat"><span>' + n + '</span><b>' + Math.round(v) + ' <small>' + u + '</small></b><span>of ' + g + ' ' + u + '</span><div class="bar"><i style="width:' + Math.min(100, v / g * 100) + '%"></i></div></div>').join('');
  const pct = Math.round(t.calories / profile.calorieGoal * 100);
  $('#ring').style.setProperty('--p', Math.min(100, pct)); $('#ringN').textContent = pct + '%';
  $('#waterTxt').textContent = d.water + ' / ' + profile.waterGoal + ' ml'; $('#waterBar').style.width = Math.min(100, d.water / profile.waterGoal * 100) + '%';
  $('#meals').innerHTML = meals.length ? meals.map(m => '<div class="item"><div>' + esc(m.name) + '<small>' + m.mealType + ' · ' + m.quantity + ' × ' + esc(m.serving) + '</small></div><b>' + Math.round(m.totals.calories) + ' kcal</b></div>').join('') : '<div class="empty">No meals logged today yet.</div>';
  const labels = week.map(w => new Date(w.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })), data = week.map(w => Math.round(w.totals.calories));
  if (chart) chart.destroy();
  const canvas = $('#week');
  const fallback = $('#weekFallback');
  if (window.Chart) {
    canvas.hidden = false;
    fallback.hidden = true;
    chart = new Chart(canvas, { type: 'bar', data: { labels, datasets: [{ label: 'Calories', data, backgroundColor: '#ff6b35', borderRadius: 6, maxBarThickness: 42 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => Math.round(c.raw) + ' kcal' } } }, scales: { y: { beginAtZero: true, grid: { color: '#2b3033' }, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
  } else {
    const max = Math.max(1, ...data);
    canvas.hidden = true;
    fallback.hidden = false;
    fallback.setAttribute('aria-label', 'Weekly calories: ' + labels.map((l, i) => l + ' ' + data[i] + ' kcal').join(', '));
    fallback.innerHTML = labels.map((l, i) => '<div class="week-day"><span class="week-value">' + (data[i] ? data[i] + ' kcal' : '') + '</span><div class="week-track"><i style="height:' + (data[i] ? Math.max(5, data[i] / max * 100) : 3) + '%"></i></div><span>' + esc(l) + '</span></div>').join('');
  }
}
document.querySelectorAll('[data-w]').forEach(b => b.onclick = async () => { try { await api('/water', { method: 'POST', body: { ml: +b.dataset.w, date: todayStr() } }); load(); } catch (e) { toast(e.message, 1); } });
$('#insightBtn').onclick = async () => {
  $('#insight').className = 'empty'; $('#insight').textContent = 'Thinking…';
  try { const r = await api('/ai/chat', { method: 'POST', body: { message: 'Give a short, encouraging insight about what I have eaten today and one simple balanced suggestion.' } }); $('#insight').className = 'card ai'; $('#insight').textContent = r.reply; }
  catch (e) { $('#insight').textContent = e.message; }
};
load().catch(e => toast(e.message, 1));
