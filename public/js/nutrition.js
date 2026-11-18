// Analytics page: draws charts from the real saved data.
buildShell('nutrition');
let charts = [];
const draw = (id, cfg) => { const c = new Chart($(id), cfg); charts.push(c); };

async function load() {
  const days = +$('#range').value, data = await api('/nutrition/range?days=' + days);
  charts.forEach(c => c.destroy()); charts = [];
  const labels = data.map(d => d.date.slice(5)), logged = data.filter(d => d.mealCount > 0);
  const sum = k => Math.round(data.reduce((a, d) => a + d.totals[k], 0));
  const avg = k => logged.length ? Math.round(sum(k) / logged.length) : 0;
  $('#stats').innerHTML = [['Total calories', sum('calories') + ' kcal'], ['Protein', sum('protein') + ' g'], ['Carbs', sum('carbs') + ' g'], ['Fat', sum('fat') + ' g'], ['Fibre', sum('fiber') + ' g'], ['Avg calories / logged day', avg('calories') + ' kcal'], ['Days logged', logged.length + ' of ' + days]]
    .map(([n, v]) => '<div class="card stat"><span>' + n + '</span><b style="font-size:21px">' + v + '</b></div>').join('');
  if (!window.Chart) {
    ['calChart', 'macroChart', 'trendChart', 'mealChart'].forEach(id => {
      $(id).hidden = true;
      let note = $('#' + id + 'Fallback');
      if (!note) { note = document.createElement('p'); note.id = id + 'Fallback'; note.className = 'empty'; $(id).after(note); }
      note.textContent = 'Chart library unavailable. Your saved totals are shown above.';
    });
    return;
  }
  draw('#calChart', { type: 'line', data: { labels, datasets: [{ label: 'kcal', data: data.map(d => d.totals.calories), borderColor: '#ff6b35', backgroundColor: '#ff6b3530', fill: true, tension: .3 }] }, options: { plugins: { legend: { display: false } } } });
  draw('#macroChart', { type: 'doughnut', data: { labels: ['Protein', 'Carbs', 'Fat'], datasets: [{ data: [sum('protein'), sum('carbs'), sum('fat')], backgroundColor: ['#ff6b35', '#b5d96c', '#f5ba58'] }] } });
  draw('#trendChart', { type: 'line', data: { labels, datasets: [['protein', '#ff6b35'], ['carbs', '#b5d96c'], ['fat', '#f5ba58']].map(([k, c]) => ({ label: k, data: data.map(d => d.totals[k]), borderColor: c, tension: .3 })) } });
  // meal type comparison: add up calories of every meal in the period
  const type = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  for (const d of data.filter(d => d.mealCount)) (await api('/meals?date=' + d.date)).forEach(m => type[m.mealType] += m.totals.calories);
  draw('#mealChart', { type: 'bar', data: { labels: Object.keys(type), datasets: [{ label: 'kcal', data: Object.values(type).map(Math.round), backgroundColor: '#ff6b35', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } } } });
}
$('#range').onchange = () => load().catch(e => toast(e.message, 1));
$('#tipsBtn').onclick = async () => {
  const button = $('#tipsBtn'), result = $('#tipsResult');
  button.disabled = true;
  result.textContent = 'Looking at your saved food and activity logs…';
  try {
    const days = +$('#range').value;
    const answer = await api('/ai/chat', { method: 'POST', body: {
      rangeDays: days,
      message: 'Give me two short sections titled Food tips and Movement tips. Base both on my saved nutrition and exercise data for the selected ' + days + '-day period. Offer one practical, balanced food suggestion and one approachable exercise suggestion. If my logs do not provide enough information, say so and keep the advice general. Do not recommend weight loss, calorie restriction, or intense exercise.'
    } });
    result.textContent = answer.reply;
  } catch (e) {
    result.textContent = e.message;
  } finally {
    button.disabled = false;
  }
};
load().catch(e => toast(e.message, 1));
