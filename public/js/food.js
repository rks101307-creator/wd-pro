// Food Tracker page: search foods, add / edit / delete meals, custom foods. All data is saved by the server.
buildShell('food');
const TYPES = ['breakfast', 'lunch', 'dinner', 'snack'], NUT = [['calories', 'Calories (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)'], ['fiber', 'Fibre (g)']];
let meals = [], onSave = null;
$('#day').value = todayStr();

async function load() {
  meals = await api('/meals?date=' + $('#day').value);
  $('#sections').innerHTML = TYPES.map(t => {
    const list = meals.filter(m => m.mealType === t), kcal = Math.round(list.reduce((a, m) => a + m.totals.calories, 0));
    return '<div class="card"><h2 style="text-transform:capitalize">' + t + ' <span class="tag">' + kcal + ' kcal</span></h2>' +
      (list.length ? list.map(m => '<div class="item"><div>' + esc(m.name) + '<small>' + m.quantity + ' × ' + esc(m.serving) + ' · ' + Math.round(m.totals.calories) + ' kcal · P ' + m.totals.protein + 'g C ' + m.totals.carbs + 'g F ' + m.totals.fat + 'g</small></div><div class="row" style="flex:none"><button class="btn ghost sm" data-edit="' + m.id + '">Edit</button><button class="btn del sm" data-del="' + m.id + '">Delete</button></div></div>').join('') : '<div class="empty">Nothing logged.</div>') + '</div>';
  }).join('');
  const s = k => Math.round(meals.reduce((a, m) => a + m.totals[k], 0) * 10) / 10;
  $('#total').innerHTML = NUT.map(([k, l]) => '<div><b>' + s(k) + '</b><div class="sub">' + l + '</div></div>').join('');
}

function openModal(title, html, save) { $('#mTitle').textContent = title; $('#mBody').innerHTML = html; onSave = save; $('#modal').classList.add('on'); }
function closeModal() { $('#modal').classList.remove('on'); }
$('#mCancel').onclick = closeModal;
$('#mSave').onclick = async () => { try { await onSave(); closeModal(); await load(); } catch (e) { toast(e.message, 1); } };
const nutFields = per => NUT.map(([k, l]) => '<label>' + l + ' per serving</label><input type="number" min="0" step="any" data-n="' + k + '" value="' + (per?.[k] ?? 0) + '">').join('');
const readPer = () => Object.fromEntries([...document.querySelectorAll('[data-n]')].map(i => [i.dataset.n, +i.value || 0]));

function addFood(f) {
  openModal('Add ' + f.name, '<label>Meal</label><select id="mt">' + TYPES.map(t => '<option>' + t + '</option>').join('') + '</select><label>Quantity (number of servings of ' + esc(f.serving) + ')</label><input id="qty" type="number" min="0.25" step="0.25" value="1">' + nutFields(f.per) + '<p class="sub">Estimates — adjust if your portion differs.</p>',
    () => api('/meals', { method: 'POST', body: { date: $('#day').value, mealType: $('#mt').value, name: f.name, serving: f.serving, quantity: +$('#qty').value, per: readPer() } }));
}
$('#sections').onclick = e => {
  const id = e.target.dataset.edit || e.target.dataset.del, m = meals.find(x => x.id === id); if (!m) return;
  if (e.target.dataset.del) { if (confirm('Delete ' + m.name + '?')) api('/meals/' + id, { method: 'DELETE' }).then(load).catch(x => toast(x.message, 1)); return; }
  openModal('Edit ' + m.name, '<label>Meal</label><select id="mt">' + TYPES.map(t => '<option' + (t === m.mealType ? ' selected' : '') + '>' + t + '</option>').join('') + '</select><label>Quantity (× ' + esc(m.serving) + ')</label><input id="qty" type="number" min="0.25" step="0.25" value="' + m.quantity + '">' + nutFields(m.per),
    () => api('/meals/' + id, { method: 'PUT', body: { mealType: $('#mt').value, quantity: +$('#qty').value, per: readPer() } }));
};
$('#custom').onclick = () => openModal('Custom food', '<label>Name</label><input id="cn"><label>Serving description</label><input id="cs" placeholder="e.g. 1 bowl (150 g)">' + nutFields(),
  async () => { const name = $('#cn').value.trim(); if (!name) throw new Error('Enter a food name'); const f = await api('/foods', { method: 'POST', body: { name, serving: $('#cs').value || '1 serving', per: readPer() } }); setTimeout(() => addFood(f), 0); });

let timer; $('#q').oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
  const q = $('#q').value.trim(), box = $('#results'); if (!q) { box.hidden = true; return; }
  const foods = await api('/foods?q=' + encodeURIComponent(q)).catch(() => []);
  box.hidden = false; box.innerHTML = foods.length ? foods.map((f, i) => '<div data-i="' + i + '">' + esc(f.name) + ' <small class="sub">' + esc(f.serving) + ' · ' + f.per.calories + ' kcal</small></div>').join('') : '<div>No match — try “Custom food”.</div>';
  box.onclick = e => { const i = e.target.closest('[data-i]')?.dataset.i; if (i !== undefined) { box.hidden = true; $('#q').value = ''; addFood(foods[i]); } };
}, 200); };
$('#day').onchange = load;
load().catch(e => toast(e.message, 1));
