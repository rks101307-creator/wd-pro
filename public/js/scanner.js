// AI Food Scanner: get a photo (camera or upload) -> send to server -> review -> confirm -> save.
buildShell('scanner');
let imageData = null, stream = null, items = [];

function showImage(dataUrl) {
  imageData = dataUrl;
  $('#preview').src = dataUrl; $('#preview').style.display = 'block';
  $('#video').style.display = 'none'; $('#analyzeBtn').disabled = false;
}
function stopCamera() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; $('#captureBtn').hidden = true; }

// Shrinks the picture so it uploads fast (max 1024px wide).
function toDataUrl(source, w, h) {
  const scale = Math.min(1, 1024 / w), c = $('#snap');
  c.width = w * scale; c.height = h * scale;
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

$('#camBtn').onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });   // asks permission
    $('#video').srcObject = stream; $('#video').style.display = 'block'; $('#preview').style.display = 'none'; $('#captureBtn').hidden = false;
  } catch { toast('Camera not available or permission denied. You can upload a photo instead.', 1); }
};
$('#captureBtn').onclick = () => { const v = $('#video'); showImage(toDataUrl(v, v.videoWidth, v.videoHeight)); stopCamera(); };
$('#file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => showImage(toDataUrl(img, img.width, img.height));
  img.onerror = () => toast('That file is not a readable image.', 1);
  img.src = URL.createObjectURL(f);
};

$('#analyzeBtn').onclick = async () => {
  $('#status').textContent = 'Analyzing… this can take a few seconds.'; $('#analyzeBtn').disabled = true;
  try {
    const r = await api('/ai/analyze-food', { method: 'POST', body: { image: imageData } });
    items = r.items.map(i => ({ name: i.name || 'Unknown food', serving: i.serving || '1 serving', quantity: +i.quantity || 1, per: { calories: +i.calories || 0, protein: +i.protein || 0, carbs: +i.carbs || 0, fat: +i.fat || 0, fiber: +i.fiber || 0 }, confidence: i.confidence || 'low' }));
    $('#status').textContent = items.length ? (r.note || 'Please check the results below.') : 'No food was recognised. Try a clearer photo.';
    draw();
  } catch (e) { $('#status').textContent = e.message; }
  $('#analyzeBtn').disabled = false;
};

// Shows each detected item as editable fields so the user can correct the AI.
function draw() {
  $('#saveBtn').hidden = !items.length;
  if (!items.length) { $('#items').innerHTML = '<div class="empty">No items.</div>'; return; }
  $('#items').innerHTML = items.map((it, n) => '<div class="item" style="display:block"><div class="row"><input data-n="' + n + '" data-f="name" value="' + esc(it.name) + '"><span class="tag">confidence: ' + esc(it.confidence) + '</span></div>' +
    '<div class="row" style="margin-top:6px"><input data-n="' + n + '" data-f="quantity" type="number" min="0.25" step="0.25" value="' + it.quantity + '" title="Portions"><input data-n="' + n + '" data-f="calories" type="number" min="0" value="' + it.per.calories + '" title="kcal per serving"><button class="btn del sm" data-rm="' + n + '">Remove</button></div>' +
    '<small>' + esc(it.serving) + ' · portions × kcal per serving</small></div>').join('');
}
$('#items').oninput = e => { const n = e.target.dataset.n, f = e.target.dataset.f; if (n === undefined) return; if (f === 'name') items[n].name = e.target.value; else if (f === 'quantity') items[n].quantity = +e.target.value; else items[n].per.calories = +e.target.value || 0; };
$('#items').onclick = e => { if (e.target.dataset.rm !== undefined) { items.splice(+e.target.dataset.rm, 1); draw(); } };

// Nothing is saved until the user presses this button.
$('#saveBtn').onclick = async () => {
  try {
    for (const it of items) await api('/meals', { method: 'POST', body: { date: todayStr(), mealType: $('#mealType').value, name: it.name, serving: it.serving, quantity: it.quantity, per: it.per } });
    toast('Meal saved. Values are estimates.'); items = []; draw(); $('#status').textContent = '';
  } catch (e) { toast(e.message, 1); }
};
