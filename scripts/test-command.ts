import fs from 'fs';
import path from 'path';

// Load .env ourselves (no external deps)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\n+/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key] = process.env[key] ?? val;
  });
}

const ANYTHING_LLM_URL = process.env.ANYTHING_LLM_URL;
const ANYTHING_LLM_KEY = process.env.ANYTHING_LLM_KEY;
const ANYTHING_LLM_WORKSPACE = process.env.ANYTHING_LLM_WORKSPACE;

async function main() {
  if (!ANYTHING_LLM_URL || !ANYTHING_LLM_KEY) {
    console.error('Missing ANYTHING_LLM_URL or ANYTHING_LLM_KEY in environment');
    process.exit(1);
  }

  const systemPrompt = `You are the ANC Engine Controller. You have tools to modify the proposal. When the user asks for something, output a JSON object with the action.\nAvailable Actions:\n- { type: 'ADD_SCREEN', payload: { name, width, height, pitch, productType, quantity } }\n- { type: 'UPDATE_CLIENT', payload: { name, address } }\n- { type: 'SET_MARGIN', payload: { value } }\nIf no action is needed, reply with plain text. When returning an action, output only the JSON object and nothing else.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: "Add a 20x10 outdoor 10mm screen called Main Board." },
  ];

  try {
    // Try both potential auth endpoints (some installs put /api/v1 on the base, others don't)
  const authCandidates = [
    '/auth',
    '/api/v1/auth',
    '/api/auth',
    '/api/v1/auth/check',
  ];

  for (const p of authCandidates) {
    const endpoint = `${ANYTHING_LLM_URL.replace(/\/$/, '')}${p.startsWith('/') ? p : '/' + p}`;
    console.log('\nGET', endpoint);
    try {
      const authRes = await fetch(endpoint, { method: 'GET', headers: { Authorization: `Bearer ${ANYTHING_LLM_KEY}` } });
      console.log('status:', authRes.status);
      const authText = await authRes.text();
      console.log('preview:', authText.slice(0, 400).replace(/\n/g, '\\n'));
      try { console.log('parsed:', JSON.parse(authText)); break; } catch (e) { console.log('---> not JSON'); }
    } catch (e) { console.error('failed:', e); }
  }

  // Then try workspace chat endpoint variants
  let workspace = ANYTHING_LLM_WORKSPACE || 'researcher';
  const chatCandidates = [
    `/workspace/${workspace}/chat`,
    `/api/v1/workspace/${workspace}/chat`,
    `/api/workspace/${workspace}/chat`,
    `/workspace/${workspace}/chat/completions`,
    `/chat/workspace/${workspace}`,
  ];

  for (const p of chatCandidates) {
    const endpoint = `${ANYTHING_LLM_URL.replace(/\/$/, '')}${p.startsWith('/') ? p : '/' + p}`;
    console.log('\nPOST', endpoint);
    try {
      const chatRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
        body: JSON.stringify({ input: 'Add a 20x10 outdoor 10mm screen called Main Board.' }),
      });
      console.log('status:', chatRes.status);
      const chatText = await chatRes.text();
      console.log('preview:', chatText.slice(0, 400).replace(/\n/g, '\\n'));
      try { console.log('parsed:', JSON.parse(chatText)); break; } catch (e) { console.log('---> not JSON'); }
    } catch (e) { console.error('failed:', e); }
  }

  // If workspace doesn't exist, try to create it using several candidate paths
  const createCandidates = ['/workspace/new', '/api/v1/workspace/new', '/api/workspace/new'];
  for (const p of createCandidates) {
    const endpoint = `${ANYTHING_LLM_URL.replace(/\/$/, '')}${p.startsWith('/') ? p : '/' + p}`;
    console.log('\nAttempting to create workspace via POST', endpoint);
    try {
      const createRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
        body: JSON.stringify({ name: 'ANC Estimator Workspace', slug: ANYTHING_LLM_WORKSPACE }),
      });
      console.log('create status:', createRes.status);
      const createText = await createRes.text();
      console.log('create preview:', createText.slice(0, 400).replace(/\n/g, '\\n'));
      try { const parsedCreate = JSON.parse(createText); console.log('create parsed:', parsedCreate); workspace = parsedCreate?.workspace?.slug ?? workspace; console.log('using workspace slug:', workspace); break; } catch (e) { console.log('---> create responded non-JSON'); }
    } catch (e) {
      console.error('create request failed:', e);
    }
  }

  // After create attempt, try chat again with the final workspace slug using multiple candidate paths
  const finalChatCandidates = [
    `/workspace/${workspace}/chat`,
    `/api/v1/workspace/${workspace}/chat`,
    `/api/workspace/${workspace}/chat`,
  ];

  const payloadCandidates = [
    { input: 'Add a 20x10 outdoor 10mm screen called Main Board.' },
    { message: 'Add a 20x10 outdoor 10mm screen called Main Board.' },
    { text: 'Add a 20x10 outdoor 10mm screen called Main Board.' },
    { prompt: 'Add a 20x10 outdoor 10mm screen called Main Board.' },
    { query: 'Add a 20x10 outdoor 10mm screen called Main Board.' },
    { messages: [{ role: 'user', content: 'Add a 20x10 outdoor 10mm screen called Main Board.' }] },
    { input: { text: 'Add a 20x10 outdoor 10mm screen called Main Board.' } },
    { message: { text: 'Add a 20x10 outdoor 10mm screen called Main Board.' } },
    { message: { content: 'Add a 20x10 outdoor 10mm screen called Main Board.' } },
    { messages: [{ text: 'Add a 20x10 outdoor 10mm screen called Main Board.' }] },
    { messages: [{ content: 'Add a 20x10 outdoor 10mm screen called Main Board.' }] },
    { user_input: 'Add a 20x10 outdoor 10mm screen called Main Board.' },
    { q: 'Add a 20x10 outdoor 10mm screen called Main Board.' },
    { message: { type: 'text', text: 'Add a 20x10 outdoor 10mm screen called Main Board.' } },
    { messages: [{ role: 'user', text: 'Add a 20x10 outdoor 10mm screen called Main Board.' }] },
  ];

  // Also try raw text/plain body
  const rawBodies = [
    'Add a 20x10 outdoor 10mm screen called Main Board.',
    JSON.stringify({ input: 'Add a 20x10 outdoor 10mm screen called Main Board.' }),
  ];

  for (const p of finalChatCandidates) {
    const endpoint = `${ANYTHING_LLM_URL.replace(/\/$/, '')}${p.startsWith('/') ? p : '/' + p}`;
    console.log('\nPOST', endpoint);
    for (const body of payloadCandidates) {
      console.log(' - Trying payload shape:', Object.keys(body));
      try {
        const finalRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
          body: JSON.stringify(body),
        });
        console.log('status:', finalRes.status);
        const finalText = await finalRes.text();
        console.log('preview:', finalText.slice(0, 600).replace(/\n/g, '\\n'));
        try {
          const parsed = JSON.parse(finalText);
          console.log('---> Parsed JSON (success)');
          console.dir(parsed, { depth: 2 });
        } catch (e) {
          console.log('---> not JSON');
        }
      } catch (err) {
        if (err === 'done') break;
        console.error('failed:', err);
      }
    }

    // Try raw plain text bodies
    for (const rb of rawBodies) {
      console.log(' - Trying raw text body (text/plain)');
      try {
        const rRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
          body: rb,
        });
        console.log('status:', rRes.status);
        const rText = await rRes.text();
        console.log('preview:', rText.slice(0, 600).replace(/\n/g, '\\n'));
        try { console.log('parsed:', JSON.parse(rText)); break; } catch (e) { console.log('---> not JSON'); }
      } catch (err) {
        console.error('failed:', err);
      }
    }
  }

  } catch (error) {
    console.error('Request error:', error);
  }
}

main();
