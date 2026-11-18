// History page: calendar, search by date, filter by meal type, monthly chart.
buildShell('history');
let month = todayStr().slice(0, 7), chart;
const filters = () => ({ q: $('#q').value.trim(), type: $('#type').value, date: $('#date').value });

async function load() {
  const f = filters(), qs = new URLSearchParams({ ...(f.date ? { date: f.date } : { month }), ...(f.type && { type: f.type }), ...(f.q && { q: f.q }) });
  const days = await api('/history?' + qs);
  $('#list').innerHTML = days.length ? days.map(d => '<div class="card" style="box-shadow:none;border:1px solid var(--line);margin-bottom:10px"><b>' + d.date + '</b> <span class="tag">' + Math.round(d.totals.calories) + ' kcal · P ' + d.totals.protein + 'g · C ' + d.totals.carbs + 'g · F ' + d.totals.fat + 'g</span>' +
    d.meals.map(m => '<div class="item"><div>' + esc(m.name) + '<small>' + m.mealType + ' · ' + m.quantity + ' × ' + esc(m.serving) + '</small></div><span>' + Math.round(m.totals.calories) + ' kcal</span></div>').join('') +
    d.exercise.map(e => '<div class="item"><div>' + esc(e.name) + '<small>' + (e.source === 'watch' ? 'Watch activity · ' : '') + (e.distanceKm ? e.distanceKm + ' km · ' : '') + (e.route ? esc(e.route) + ' · ' : '') + e.minutes + ' min</small></div><span>' + e.minutes + ' min</span></div>').join('') +
    d.sleep.map(s => '<div class="item"><div>Sleep<small>Quality ' + s.quality + '/5' + (s.source === 'watch' ? ' · Watch' : '') + '</small></div><span>' + s.hours + ' h</span></div>').join('') + '</div>').join('') : '<div class="empty">No records found.</div>';
  drawCalendar(await api('/history?month=' + month));
}

// Builds the month grid; days that have records are highlighted and clickable.
function drawCalendar(monthDays) {
  const [y, m] = month.split('-').map(Number), first = new Date(y, m - 1, 1).getDay(), count = new Date(y, m, 0).getDate();
  const has = Object.fromEntries(monthDays.map(d => [d.date, d.totals.calories]));
  $('#monthName').textContent = new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => '<small class="sub">' + d + '</small>').join('') + '<span></span>'.repeat(first);
  for (let d = 1; d <= count; d++) { const date = month + '-' + String(d).padStart(2, '0'); html += '<button class="btn sm ' + (date in has ? '' : 'ghost') + '" data-date="' + date + '">' + d + '</button>'; }
  $('#cal').innerHTML = html;
  const labels = [...Array(count)].map((_, i) => i + 1), data = labels.map(d => Math.round(has[month + '-' + String(d).padStart(2, '0')] || 0));
  if (chart) chart.destroy();
  if (window.Chart) {
    $('#monthChart').hidden = false;
    chart = new Chart($('#monthChart'), { type: 'bar', data: { labels, datasets: [{ label: 'kcal', data, backgroundColor: '#ff6b35' }] }, options: { plugins: { legend: { display: false } } } });
  } else {
    $('#monthChart').hidden = true;
    let fallback = $('#monthChartFallback');
    if (!fallback) { fallback = document.createElement('p'); fallback.id = 'monthChartFallback'; fallback.className = 'empty'; $('#monthChart').after(fallback); }
    fallback.textContent = 'Chart library unavailable. Your daily records are still shown in the calendar and history list.';
  }
}
$('#cal').onclick = e => { if (e.target.dataset.date) { $('#date').value = e.target.dataset.date; load(); } };
const shift = n => { const [y, m] = month.split('-').map(Number), d = new Date(y, m - 1 + n, 1); month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); $('#date').value = ''; load(); };
$('#prev').onclick = () => shift(-1); $('#next').onclick = () => shift(1);
['q', 'type', 'date'].forEach(id => $('#' + id).addEventListener('input', () => load().catch(e => toast(e.message, 1))));
load().catch(e => toast(e.message, 1));
