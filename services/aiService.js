// Talks to Groq from the SERVER only, so your API key never reaches the browser.
// Two functions: chat() for text questions, analyzeImage() for food photos.
const URL = 'https://api.groq.com/openai/v1/chat/completions';

function fail(msg, status) { const e = new Error(msg); e.status = status; return e; }

function isConfigured(modelVar) {
  const key = process.env.GROQ_API_KEY, model = process.env[modelVar];
  return !!(key && key !== 'your_api_key' && model && !model.startsWith('your_'));
}

// Sends messages to Groq and returns the reply text. Throws friendly errors.
async function callGroq(modelVar, messages, maxTokens) {
  if (!isConfigured(modelVar)) throw fail('AI is not configured. Add GROQ_API_KEY and ' + modelVar + ' to your .env file, then restart the server.', 503);
  let res;
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.GROQ_API_KEY },
      body: JSON.stringify({ model: process.env[modelVar], messages, temperature: 0.4, max_tokens: maxTokens })
    });
  } catch { throw fail('Could not reach Groq. Check your internet connection.', 502); }
  if (res.status === 429) throw fail('Groq rate limit reached. Wait a minute and try again.', 429);
  if (res.status === 401) throw fail('Groq rejected your API key. Check GROQ_API_KEY in .env.', 502);
  if (!res.ok) throw fail('Groq error (' + res.status + '). Check that the model name in .env is valid.', 502);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

const chat = messages => callGroq('GROQ_TEXT_MODEL', messages, 600);

// imageDataUrl looks like "data:image/jpeg;base64,...."
async function analyzeImage(imageDataUrl) {
  const prompt = 'Look at this food photo. Reply with ONLY JSON like: {"items":[{"name":"...","serving":"e.g. 1 bowl","quantity":1,"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"confidence":"low|medium|high"}],"note":"short uncertainty note"}. Values are rough per-serving estimates. If you cannot see food, return {"items":[],"note":"No food found"}.';
  const text = await callGroq('GROQ_VISION_MODEL', [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] }], 700);
  try {
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));   // pull the JSON out of the reply
    return { items: Array.isArray(json.items) ? json.items : [], note: json.note || '' };
  } catch { throw fail('The AI answered in an unexpected format. Please try again.', 502); }
}
module.exports = { chat, analyzeImage, isConfigured };
