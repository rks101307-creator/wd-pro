// Shared helpers + sidebar used by every page.
const PAGES = [['dashboard','Dashboard','layout-dashboard'],['food','Food Tracker','utensils'],['scanner','AI Food Scanner','scan'],['nutrition','Analytics','bar-chart-3'],['assistant','AI Assistant','message-circle'],['exercise','Exercise','activity'],['history','History','calendar'],['settings','Settings','settings']];
const READY = PAGES.map(p => p[0]);   // every page is built now
const $ = (s, r = document) => r.querySelector(s);
const todayStr = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if (window.Chart) { Chart.defaults.color = '#a0a5a7'; Chart.defaults.borderColor = '#2b3033'; }

// If the page is opened by double-clicking the .html file, talk to the local server directly.
const API_BASE = location.protocol === 'file:' ? 'http://localhost:3000' : '';

async function api(path, opts = {}) {
  let res;
  try { res = await fetch(API_BASE + '/api' + path, { headers: { 'Content-Type': 'application/json' }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined }); }
  catch { throw new Error('Cannot reach the NutriTrack server. Is it running?'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 3500); }

function buildShell(active) {
  const nav = document.createElement('nav'); nav.className = 'side'; nav.id = 'side'; nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML = '<div class="brand"><i data-lucide="leaf"></i>NutriTrack AI</div>' + PAGES.map(([id, label, icon]) =>
    '<a href="' + id + '.html" class="' + (id === active ? 'on ' : '') + (READY.includes(id) ? '' : 'soon') + '"><i data-lucide="' + icon + '"></i>' + label + '</a>').join('');
  document.body.prepend(nav);
  const mobileNav = document.createElement('nav'); mobileNav.className = 'mobile-nav'; mobileNav.setAttribute('aria-label', 'Quick navigation');
  const quickPages = [['dashboard','Home','house'],['food','Food','utensils'],['exercise','Activity','activity']];
  const moreActive = !quickPages.some(([id]) => id === active);
  mobileNav.innerHTML = quickPages.map(([id, label, icon]) => '<a href="' + id + '.html" class="' + (active === id ? 'on' : '') + '"><i data-lucide="' + icon + '"></i><span>' + label + '</span></a>').join('') + '<button type="button" id="moreBtn" class="' + (moreActive ? 'on' : '') + '" aria-expanded="false" aria-controls="side"><i data-lucide="ellipsis"></i><span>More</span></button>';
  document.body.append(mobileNav);
  const backdrop = document.createElement('button'); backdrop.className = 'nav-backdrop'; backdrop.type = 'button'; backdrop.setAttribute('aria-label', 'Close navigation'); document.body.append(backdrop);
  const menuButton = $('#menuBtn'), moreButton = $('#moreBtn');
  const closeNav = () => { nav.classList.remove('open'); backdrop.classList.remove('on'); menuButton?.setAttribute('aria-expanded', 'false'); moreButton?.setAttribute('aria-expanded', 'false'); };
  const toggleNav = () => { const open = nav.classList.toggle('open'); backdrop.classList.toggle('on', open); menuButton?.setAttribute('aria-expanded', String(open)); moreButton?.setAttribute('aria-expanded', String(open)); };
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.addEventListener('click', toggleNav);
  moreButton?.addEventListener('click', toggleNav);
  backdrop.addEventListener('click', closeNav);
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  if (window.lucide) lucide.createIcons();
  checkServer();
}

// Shows a clear help banner if the server is not running yet.
async function checkServer() {
  try { await fetch(API_BASE + '/api/ai/status'); }
  catch {
    const b = document.createElement('div');
    b.className = 'toast err'; b.style.cssText = 'top:16px;bottom:auto;left:50%;right:auto;transform:translateX(-50%);text-align:center';
    b.innerHTML = 'The NutriTrack server is not running.<br>Double-click <b>start.bat</b> (Windows), or run <b>npm start</b>, then refresh this page.';
    document.body.append(b);
  }
}
