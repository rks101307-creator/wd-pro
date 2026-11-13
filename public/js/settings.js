// Settings page: profile, AI status, backup / restore / clear.
buildShell('settings');
const FIELDS = ['calorieGoal', 'proteinGoal', 'carbsGoal', 'fatGoal', 'fiberGoal', 'waterGoal'];

async function load() {
  const p = await api('/profile');
  $('#name').value = p.name || ''; $('#age').value = p.age || ''; $('#prefs').value = p.preferences || '';
  FIELDS.forEach(f => $('#' + f).value = p[f]);
  const s = await api('/ai/status');
  $('#aiStatus').textContent = 'Text AI: ' + (s.text ? 'configured ✔' : 'not configured') + ' · Vision AI: ' + (s.vision ? 'configured ✔' : 'not configured');
}
$('#saveProfile').onclick = async () => {
  const body = { name: $('#name').value, age: $('#age').value, preferences: $('#prefs').value };
  FIELDS.forEach(f => body[f] = $('#' + f).value);
  try { await api('/profile', { method: 'PUT', body }); toast('Profile saved'); } catch (e) { toast(e.message, 1); }
};
$('#backup').onclick = async () => { try { toast('Backup saved: ' + (await api('/settings/backup', { method: 'POST' })).file); } catch (e) { toast(e.message, 1); } };
$('#importFile').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());                       // is it valid JSON?
    if (!confirm('Restoring will replace your current data. Continue?')) return;
    await api('/settings/import', { method: 'POST', body: data }); toast('Backup restored'); load();
  } catch (err) { toast(err.message.includes('JSON') ? 'That file is not valid JSON.' : err.message, 1); }
  e.target.value = '';
};
$('#clear').onclick = async () => {
  if (prompt('This deletes all your data. Type DELETE to confirm.') !== 'DELETE') return;
  try { await api('/settings/clear', { method: 'DELETE', body: { confirm: 'DELETE' } }); toast('All data cleared'); load(); } catch (e) { toast(e.message, 1); }
};
$('#dl').href = API_BASE + '/api/settings/export';
load().catch(e => toast(e.message, 1));
