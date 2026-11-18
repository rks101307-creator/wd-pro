// Chat page: sends your question to the server, which adds your saved data and asks Groq.
buildShell('assistant');
const history = [];                                   // remembers the conversation
function bubble(role, text) {
  const d = document.createElement('div');
  d.className = role === 'user' ? 'item' : 'card ai'; d.style.margin = '8px 0';
  d.textContent = (role === 'user' ? 'You: ' : '') + text;
  $('#chat').append(d); $('#chat').scrollTop = 1e6; return d;
}
async function send() {
  const text = $('#msg').value.trim(); if (!text) return;
  $('#msg').value = ''; if ($('#chat .empty')) $('#chat').innerHTML = '';
  bubble('user', text); const wait = bubble('assistant', 'Thinking…');
  try {
    const r = await api('/ai/chat', { method: 'POST', body: { message: text, history, includeExercise: $('#includeExercise').checked } });
    wait.textContent = r.reply; history.push({ role: 'user', content: text }, { role: 'assistant', content: r.reply });
  } catch (e) { wait.textContent = e.message; wait.className = 'item'; }   // AI offline? show the error, app still works
}
$('#send').onclick = send;
$('#msg').onkeydown = e => { if (e.key === 'Enter') send(); };
