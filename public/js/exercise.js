// Workout library, AI plan builder, guided sessions, challenges and activity history.
buildShell('exercise');
let lib = [], logEntries = [], current = null, chart, filters = ['All'], sessionTimer, elapsed = 0, paused = false, stepIndex = 0;
$('#sleepDate').value = todayStr();
const weekStart = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const thisWeek = rows => rows.filter(x => x.date >= weekStart());

function renderLibrary() {
  const query = $('#exerciseSearch').value.trim().toLowerCase(), category = $('#exerciseFilters').dataset.active || 'All';
  const shown = lib.filter(x => (category === 'All' || x.category === category) && (!query || (x.name + ' ' + x.category + ' ' + x.description).toLowerCase().includes(query)));
  $('#lib').innerHTML = shown.length ? shown.map(x => '<div class="item workout-item"><div><b>' + esc(x.name) + '</b><small>' + esc(x.category) + ' · ' + x.defaultMinutes + ' min</small></div><button class="btn ghost sm" data-id="' + esc(x.id) + '">View</button></div>').join('') : '<div class="empty">No workouts match. Try a different search.</div>';
}

function renderFilters() {
  const categories = ['All', ...new Set(lib.map(x => x.category))];
  $('#exerciseFilters').dataset.active = 'All';
  $('#exerciseFilters').innerHTML = categories.map(c => '<button class="filter-chip ' + (c === 'All' ? 'on' : '') + '" data-category="' + esc(c) + '">' + esc(c) + '</button>').join('');
}

function renderChallenge() {
  const count = thisWeek(logEntries).length, goal = 3;
  $('#challengeCount').textContent = Math.min(count, goal) + ' of ' + goal + ' sessions';
  $('#challengeBar').style.width = Math.min(100, count / goal * 100) + '%';
  if (count >= goal) { $('#challengeTitle').textContent = 'Challenge complete!'; $('#challengeCopy').textContent = 'You showed up three times this week. Carry that momentum into next week.'; }
  else { $('#challengeTitle').textContent = 'Show up 3 times'; $('#challengeCopy').textContent = 'Log three activity sessions this week. Every session counts.'; }
}

async function load() {
  const [library, logs, sleepRows] = await Promise.all([api('/exercises'), api('/exercises/log?days=90'), api('/health/sleep?days=14')]);
  lib = library; logEntries = logs;
  renderFilters(); renderLibrary(); renderChallenge();
  const week = thisWeek(logEntries), total = week.reduce((sum, x) => sum + x.minutes, 0);
  $('#weekMinutes').textContent = total + ' min';
  $('#log').innerHTML = logEntries.length ? logEntries.slice().reverse().slice(0, 8).map(e => '<div class="item"><div><b>' + esc(e.name) + '</b><small>' + e.date + ' · ' + e.minutes + ' min' + (e.distanceKm ? ' · ' + e.distanceKm + ' km' : '') + (e.route ? ' · ' + esc(e.route) : '') + (e.source === 'watch' ? ' · Watch' : '') + '</small></div><button class="btn del sm" data-del="' + esc(e.id) + '" aria-label="Delete ' + esc(e.name) + '">×</button></div>').join('') : '<div class="empty">Your sessions will show here. Try a guided workout or log one from your watch.</div>';
  const avgSleep = sleepRows.length ? (sleepRows.reduce((sum, x) => sum + x.hours, 0) / sleepRows.length).toFixed(1) : null;
  $('#sleepSummary').textContent = avgSleep ? avgSleep + ' hour nightly average across ' + sleepRows.length + ' recent log' + (sleepRows.length === 1 ? '' : 's') : 'Log sleep to see your recent average.';
  $('#sleepRecent').innerHTML = sleepRows.slice(0, 3).map(x => '<div class="item"><span>' + x.date + '<small>Sleep quality ' + x.quality + '/5' + (x.source === 'watch' ? ' · Watch' : '') + '</small></span><b>' + x.hours + ' h</b></div>').join('');
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); });
  const values = days.map(d => logEntries.filter(e => e.date === d).reduce((sum, e) => sum + e.minutes, 0));
  if (chart) chart.destroy();
  if (window.Chart) {
    $('#weekChart').hidden = false; $('#weekFallback').hidden = true;
    chart = new Chart($('#weekChart'), { type: 'bar', data: { labels: days.map(d => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })), datasets: [{ label: 'Minutes', data: values, backgroundColor: '#b5d96c', borderRadius: 6, maxBarThickness: 38 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#2b3033' }, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
  } else { $('#weekChart').hidden = true; $('#weekFallback').hidden = false; $('#weekFallback').textContent = 'This week: ' + total + ' minutes of movement.'; }
}

function openDetails(exercise) {
  current = exercise;
  $('#mTitle').textContent = exercise.name; $('#mDesc').textContent = exercise.description || 'A workout built around your goals.';
  $('#mSteps').innerHTML = exercise.steps.map(s => '<li>' + esc(typeof s === 'string' ? s : s.name + (s.cue ? ' — ' + s.cue : '')) + '</li>').join('');
  $('#mins').value = exercise.defaultMinutes || exercise.minutes || 20;
  $('#modal').classList.add('on');
}

function startGuide(exercise) {
  current = exercise; stepIndex = 0; elapsed = 0; paused = false;
  $('#modal').classList.remove('on'); $('#guideModal').classList.add('on');
  $('#guideName').textContent = exercise.name;
  $('#guidePause').textContent = 'Pause';
  sessionTimer = setInterval(() => { if (!paused) { elapsed++; $('#guideClock').textContent = formatTime(elapsed); } }, 1000);
  showStep();
}

function formatTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function validDate(date) { if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false; const parsed = new Date(date + 'T00:00:00Z'); return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date; }
function showStep() {
  const steps = current.steps || [];
  const step = steps[stepIndex];
  $('#guideCount').textContent = steps.length ? 'STEP ' + (stepIndex + 1) + ' / ' + steps.length : 'YOUR SESSION';
  $('#guideStep').textContent = step ? (typeof step === 'string' ? step : step.name + (step.cue ? ' — ' + step.cue : '')) : (current.description || 'Move at a comfortable pace and take breaks when you need them.');
  $('#guideBar').style.width = steps.length ? ((stepIndex + 1) / steps.length * 100) + '%' : '100%';
  $('#guideNext').textContent = steps.length && stepIndex < steps.length - 1 ? 'Next step' : 'Complete session';
}

async function finishSession() {
  clearInterval(sessionTimer); sessionTimer = null;
  const minutes = Math.max(1, Math.min(300, Math.round(elapsed / 60)));
  $('#guideModal').classList.remove('on');
  try {
    await api('/exercises/log', { method: 'POST', body: { exerciseId: current.id && !current.generated ? current.id : undefined, name: current.name, minutes, date: todayStr() } });
    await load();
    const total = thisWeek(logEntries).length;
    $('#summaryTitle').textContent = total === 1 ? 'Your first session is in the books.' : 'Nice work showing up.';
    $('#summaryStats').textContent = minutes + ' minute' + (minutes === 1 ? '' : 's') + ' logged · ' + total + ' session' + (total === 1 ? '' : 's') + ' this week';
    $('#summaryBadge').textContent = total >= 3 ? '🏁 3-session challenge complete' : total === 1 ? '✦ First session badge earned' : '✦ Keep your streak going';
    $('#summaryModal').classList.add('on');
  } catch (e) { toast(e.message, 1); }
}

$('#lib').onclick = e => { const id = e.target.closest('[data-id]')?.dataset.id; if (id) { const exercise = lib.find(x => x.id === id); if (exercise) openDetails(exercise); } };
$('#exerciseFilters').onclick = e => { const category = e.target.closest('[data-category]')?.dataset.category; if (!category) return; $('#exerciseFilters').dataset.active = category; $('#exerciseFilters').querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('on', b.dataset.category === category)); renderLibrary(); };
$('#exerciseSearch').oninput = renderLibrary;
$('#mCancel').onclick = () => $('#modal').classList.remove('on');
$('#mLog').onclick = async () => { try { await api('/exercises/log', { method: 'POST', body: { exerciseId: current.id, minutes: +$('#mins').value, date: todayStr() } }); $('#modal').classList.remove('on'); toast('Activity logged'); await load(); } catch (e) { toast(e.message, 1); } };
$('#mStart').onclick = () => startGuide(current);
$('#guideNext').onclick = () => { if (current.steps?.length && stepIndex < current.steps.length - 1) { stepIndex++; showStep(); } else finishSession(); };
$('#guidePause').onclick = () => { paused = !paused; $('#guidePause').textContent = paused ? 'Resume' : 'Pause'; };
$('#guideFinish').onclick = finishSession;
$('#guideClose').onclick = () => { if (confirm('End this session without saving it?')) { clearInterval(sessionTimer); sessionTimer = null; $('#guideModal').classList.remove('on'); } };
$('#summaryDone').onclick = () => $('#summaryModal').classList.remove('on');
$('#log').onclick = async e => { const id = e.target.closest('[data-del]')?.dataset.del; if (!id) return; try { await api('/exercises/log/' + id, { method: 'DELETE' }); await load(); } catch (err) { toast(err.message, 1); } };

$('#generatePlan').onclick = async () => {
  const button = $('#generatePlan'), result = $('#planResult'); button.disabled = true; result.textContent = 'Building a plan around your choices…'; result.className = 'plan-result loading';
  try {
    const plan = await api('/ai/workout-plan', { method: 'POST', body: { focus: $('#planFocus').value, level: $('#planLevel').value, minutes: +$('#planTime').value, equipment: $('#planGear').value || 'none' } });
    const duration = plan.steps.reduce((sum, s) => sum + s.minutes, 0);
    result.className = 'plan-result';
    result.innerHTML = '<div class="generated-plan"><div class="card-heading"><div><span class="eyebrow">YOUR PLAN</span><h3>' + esc(plan.title) + '</h3></div><span class="tag">' + duration + ' min</span></div><p class="sub">' + esc(plan.note) + '</p><ol>' + plan.steps.map(s => '<li><b>' + esc(s.name) + '</b><small>' + s.minutes + ' min · ' + esc(s.cue) + '</small></li>').join('') + '</ol><button class="btn" id="startGenerated"><i data-lucide="play"></i> Start guided workout</button></div>';
    if (window.lucide) lucide.createIcons();
    $('#startGenerated').onclick = () => startGuide({ id: null, generated: true, name: plan.title, description: plan.note, steps: plan.steps, defaultMinutes: duration });
  } catch (e) { result.className = 'plan-result error'; result.textContent = e.message; }
  finally { button.disabled = false; }
};

$('#watchLog').onclick = async () => {
  const name = $('#watchName').value.trim(), minutes = +$('#watchMinutes').value;
  try {
    if (!name) throw new Error('Add the activity name first.');
    await api('/exercises/log', { method: 'POST', body: { name, minutes, distanceKm: $('#watchDistance').value, route: $('#watchRoute').value, date: todayStr(), source: 'watch' } });
    $('#watchName').value = ''; $('#watchMinutes').value = ''; $('#watchDistance').value = ''; $('#watchRoute').value = ''; toast('Watch activity added'); await load();
  } catch (e) { toast(e.message, 1); }
};

function parseCsvRow(line) {
  const cells = []; let value = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { cells.push(value.trim()); value = ''; }
    else value += c;
  }
  cells.push(value.trim()); return cells;
}

$('#watchImport').onclick = async () => {
  const file = $('#watchCsv').files[0];
  try {
    if (!file) throw new Error('Choose a CSV export first.');
    const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
    const header = parseCsvRow(lines.shift()).map(v => v.toLowerCase());
    const nameIndex = header.findIndex(v => ['activity', 'name', 'workout'].includes(v));
    const minutesIndex = header.findIndex(v => ['minutes', 'duration_minutes', 'duration'].includes(v));
    const dateIndex = header.findIndex(v => v === 'date');
    const distanceIndex = header.findIndex(v => ['distance_km', 'distance'].includes(v));
    const routeIndex = header.findIndex(v => v === 'route');
    if (nameIndex < 0 || minutesIndex < 0) throw new Error('CSV needs activity and minutes columns.');
    if (lines.length > 100) throw new Error('Import up to 100 activity rows at a time.');
    const rows = lines.map(parseCsvRow).map(cells => ({ name: (cells[nameIndex] || '').slice(0, 100), minutes: Number(cells[minutesIndex]), date: cells[dateIndex] || todayStr(), distanceKm: distanceIndex < 0 || !cells[distanceIndex] ? undefined : Number(cells[distanceIndex]), route: routeIndex < 0 ? undefined : (cells[routeIndex] || '').slice(0, 160) })).filter(r => r.name && Number.isFinite(r.minutes) && r.minutes > 0 && r.minutes <= 300 && validDate(r.date) && (r.distanceKm === undefined || Number.isFinite(r.distanceKm) && r.distanceKm > 0 && r.distanceKm <= 2000));
    if (!rows.length) throw new Error('No valid rows found. Use ISO dates like 2026-11-12 and durations from 1 to 300 minutes.');
    for (const row of rows) await api('/exercises/log', { method: 'POST', body: { ...row, distanceKm: Number.isFinite(row.distanceKm) ? row.distanceKm : undefined, source: 'watch' } });
    $('#watchCsv').value = ''; toast(rows.length + ' watch activit' + (rows.length === 1 ? 'y' : 'ies') + ' imported'); await load();
  } catch (e) { toast(e.message, 1); }
};

$('#sleepSave').onclick = async () => {
  try {
    await api('/health/sleep', { method: 'POST', body: { hours: +$('#sleepHours').value, quality: +$('#sleepQuality').value, date: $('#sleepDate').value } });
    $('#sleepHours').value = ''; toast('Sleep logged'); await load();
  } catch (e) { toast(e.message, 1); }
};

$('#shareChallenge').onclick = async () => {
  const message = 'I’m taking the NutriTrack 3-session challenge this week. Join me and get moving!';
  try { if (navigator.share) await navigator.share({ title: '3-session challenge', text: message }); else { await navigator.clipboard.writeText(message); toast('Challenge message copied'); } }
  catch (e) { if (e.name !== 'AbortError') toast('Could not share from this browser.', 1); }
};

load().catch(e => toast(e.message, 1));
