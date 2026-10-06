'use strict';

const store = require('./settings-store');

const PROVIDER_CATALOG = [
  { id: 'openai', name: 'OpenAI', kind: 'openai', baseUrl: 'https://api.openai.com/v1' },
  { id: 'gemini', name: 'Google Gemini', kind: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { id: 'deepseek', name: 'DeepSeek', kind: 'openai', baseUrl: 'https://api.deepseek.com' },
  { id: 'anthropic', name: 'Anthropic', kind: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'groq', name: 'Groq', kind: 'openai', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'mistral', name: 'Mistral', kind: 'openai', baseUrl: 'https://api.mistral.ai/v1' },
  { id: 'xai', name: 'xAI', kind: 'openai', baseUrl: 'https://api.x.ai/v1' },
  { id: 'custom', name: 'Custom OpenAI-compatible', kind: 'openai', baseUrl: '' },
];

/** Full in-app knowledge base — AI acts as interactive user manual */
const APP_KNOWLEDGE = `
# Snake Classic — App Guide

## What this app is
Multiplayer Snake Arcade for SoloHost. Main screens stay the game. One floating robot button opens Chat, Feedback, Settings, Logs.

## Play
- Create or join a room with a 4-letter code.
- Modes: Co-op (shared lives), Survival (last alive), Time Attack (90s), Campaign (themed maps with obstacles).
- Controls: arrows or WASD on PC; swipe or on-screen pad on phone. Gear/Esc = settings.
- Eat apples to grow. Do not hit walls, yourself, or other snakes.
- Items: apple +10, x2 double, lightning speed, freeze others, portals on some maps.
- Bots fill empty slots. Invite via LAN Connect QR / URL. Same Wi-Fi for LAN.

## AI panel
1. Chat — how to play, explain scores, recall history, room status. Can ask to announce in the room.
2. Feedback — bug/idea/question + stars. Donate accounts come only from Feedback Hub sync (never hard-coded).
3. Settings — provider (OpenAI, Gemini, DeepSeek, Anthropic, OpenRouter, Groq, Mistral, xAI, Custom), API key, Base URL, model, mode. Key is saved server-side and never shown again (only masked).
4. Logs — diagnostic log, refresh/clear.

Green dot on the robot = cloud AI configured. Red = local guide only.
`;

const TOOLS = {
  get_app_info: {
    name: 'get_app_info',
    description: 'Help about Snake Classic. Topics: play, modes, multiplayer, ai_panel, feedback, settings, logs, overview.',
    parameters: { type: 'object', properties: { topic: { type: 'string' } }, required: ['topic'] },
    handler: async ({ topic }) => {
      const t = String(topic || 'overview').toLowerCase();
      const map = {
        overview: 'Snake Classic: multiplayer snake. Nút robot → Chat / Feedback / Settings / Logs.',
        play: 'PC: mũi tên hoặc WASD. Điện thoại: vuốt hoặc pad. Ăn táo, tránh tường và rắn khác.',
        modes: 'Co-op, Survival, Time Attack 90s, Campaign.',
        multiplayer: 'Tạo phòng, chia mã 4 chữ hoặc QR LAN. Cùng Wi-Fi cho LAN. Có BOT.',
        ai_panel: 'Nút robot: Chat, Feedback, Settings, Logs. Chấm xanh = đã có API key.',
        feedback: 'Tab Feedback: gửi bug/ý tưởng. Tài khoản ủng hộ lấy từ Hub.',
        settings: 'Tab Settings: provider + API key + Base URL (Custom) + model auto + Save.',
        logs: 'Tab Logs: chẩn đoán. Refresh / Clear.',
      };
      return { topic: t, help: map[t] || map.overview, verified: true };
    },
  },
  app_action: {
    name: 'app_action',
    description: 'Client action: open_tab, show_lan, pause_hint.',
    parameters: { type: 'object', properties: { action: { type: 'string' }, value: { type: 'string' } }, required: ['action'] },
    handler: async ({ action, value }) => {
      const a = String(action || '');
      if (!['open_tab', 'show_lan', 'pause_hint'].includes(a)) return { error: 'Unknown action', ok: false };
      if (a === 'open_tab' && !['chat', 'feedback', 'settings', 'logs'].includes(String(value || 'chat'))) return { error: 'invalid tab', ok: false };
      return { ok: true, action: a, value: value || 'chat', client_execute: true };
    },
  },
};

function cfg() {
  return store.getSecrets();
}

function isConfigured() {
  const c = cfg();
  if (!c.provider || c.provider === 'none') return false;
  if (c.provider === 'custom') return !!(c.baseUrl);
  return !!(c.apiKey);
}

function catalogPublic() {
  return PROVIDER_CATALOG.map(({ id, name, kind }) => ({ id, name, kind }));
}

function buildSystemPrompt(context) {
  const ctx = context || {};
  const hist = Array.isArray(ctx.calcHistory) ? ctx.calcHistory.slice(-8) : [];
  return `You are the built-in AI assistant and interactive user manual of **Futuristic Calculator AI**.
You know this app completely. Users ask you instead of reading a help document.

${APP_KNOWLEDGE}

## Current live context
- Expression on display: ${ctx.expression || '(empty)'}
- Current result / number: ${ctx.result != null ? ctx.result : '(none)'}
- Recent calculation history:
${hist.length ? hist.map((h, i) => `${i + 1}. ${h.expr} = ${h.result}`).join('\n') : '(none yet)'}

## Rules
1. NEVER compute arithmetic yourself. ALWAYS call tool **calculate** or **percentage** so results are ✓ Verified by the engine.
2. For "how do I…", "app này dùng thế nào", feature questions → call **get_app_info** (or answer from APP_KNOWLEDGE accurately).
3. When user asks you to operate the app ("xóa máy tính", "điền 500 vào", "mở settings", "đưa kết quả vào máy tính") → call **app_action**.
4. After tools return, explain briefly in the user's language (Vietnamese if they wrote Vietnamese).
5. Mark verified numeric results with ✓ Verified.
6. Keep replies concise, friendly, practical.
7. If AI provider is the only way to answer complex questions but tools already cover help/calc/actions, prefer tools.

Tools: calculate, percentage, get_app_info, app_action.`;
}

/**
 * Offline / no-key helper: answer common help & simple calc without LLM.
 */
function localAssist(message, context) {
  const msg = String(message || '').trim();
  const lower = msg.toLowerCase();
  const actions = [];
  const ctx = context || {};
  if (/(mở|open).*(setting|cài đặt|api key)/i.test(msg)) {
    actions.push({ action: 'open_tab', value: 'settings', client_execute: true });
    return { ok: true, reply: 'Mở tab Settings — chọn provider và dán API key.', actions, verified: false, source: 'local' };
  }
  if (/(mở|open).*(feedback|phản hồi|góp ý)/i.test(msg)) {
    actions.push({ action: 'open_tab', value: 'feedback', client_execute: true });
    return { ok: true, reply: 'Mở tab Feedback.', actions, verified: false, source: 'local' };
  }
  if (/(mở|open).*(log)/i.test(msg)) {
    actions.push({ action: 'open_tab', value: 'logs', client_execute: true });
    return { ok: true, reply: 'Mở tab Logs.', actions, verified: false, source: 'local' };
  }
  if (/(lan|wifi|qr|mời|invite)/i.test(msg)) {
    actions.push({ action: 'show_lan', client_execute: true });
    return { ok: true, reply: 'Mở LAN Connect để lấy link/QR.', actions, verified: false, source: 'local' };
  }
  if (/(cách chơi|hướng dẫn|help|how to|điều khiển)/i.test(lower)) {
    return { ok: true, reply: 'PC: mũi tên hoặc WASD. Điện thoại: vuốt hoặc pad. Ăn táo, tránh tường và rắn khác. Tạo phòng rồi chia mã/QR.', actions: [], verified: false, source: 'local' };
  }
  if (/(mode|chế độ|coop|survival|campaign)/i.test(lower)) {
    return { ok: true, reply: 'Co-op chung mạng, Survival sống sót, Time Attack 90 giây, Campaign map có chướng ngại.', actions: [], verified: false, source: 'local' };
  }
  if (/(điểm|score|lịch sử|history|phòng)/i.test(lower)) {
    return { ok: true, reply: 'Phòng: ' + (ctx.code || '(chưa vào)') + (ctx.score != null ? ' · điểm ' + ctx.score : '') + '. Điểm hiện trên màn chơi và bảng kết quả.', actions: [], verified: false, source: 'local' };
  }
  if (!isConfigured()) {
    return { ok: true, reply: 'Chưa có API key. Mở tab Settings trong nút robot. Game vẫn chơi bình thường.', actions: [], verified: false, source: 'local' };
  }
  return null;
}

async function callOpenAICompat({ baseUrl, apiKey, model, messages, tools }) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: model === 'auto' ? 'gpt-4o-mini' : model,
    messages,
    temperature: 0.2,
  };
  if (tools?.length) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    body.tool_choice = 'auto';
  }
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey && apiKey !== 'local') headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    store.appendLog('error', 'openai-compat', { status: res.status, detail: text.slice(0, 120) });
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json();
}

async function callGemini({ apiKey, model, messages }) {
  const mid = model === 'auto' ? 'gemini-1.5-flash' : model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${mid}:generateContent?key=${apiKey}`;
  const system = messages.find((m) => m.role === 'system');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));
  const body = {
    contents,
    systemInstruction: system ? { parts: [{ text: system.content }] } : undefined,
    generationConfig: { temperature: 0.2 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    store.appendLog('error', 'gemini', { status: res.status, detail: text.slice(0, 120) });
    throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { choices: [{ message: { role: 'assistant', content: text } }] };
}

async function callAnthropic({ apiKey, model, messages }) {
  const mid = model === 'auto' ? 'claude-3-5-haiku-20241022' : model;
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const msgs = messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content || '',
  }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: mid, max_tokens: 1024, system, messages: msgs }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    store.appendLog('error', 'anthropic', { status: res.status });
    throw new Error(`Anthropic HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text || '';
  return { choices: [{ message: { role: 'assistant', content: text } }] };
}

async function executeTools(toolCalls) {
  const results = [];
  const actions = [];
  const verifiedResults = [];
  let m;
  for (const tc of toolCalls || []) {
    const name = tc.function?.name || tc.name;
    let args = {};
    try {
      args = typeof tc.function?.arguments === 'string'
        ? JSON.parse(tc.function.arguments || '{}')
        : (tc.function?.arguments || tc.arguments || {});
    } catch { args = {}; }
    const tool = TOOLS[name];
    if (!tool) {
      results.push({ tool_call_id: tc.id, name, content: JSON.stringify({ error: 'Unknown tool' }) });
      continue;
    }
    try {
      const out = await tool.handler(args);
      results.push({ tool_call_id: tc.id, name, content: JSON.stringify(out) });
      if (out && out.verified && out.result != null) verifiedResults.push(out);
      if (out && out.client_execute) actions.push(out);
      if (out && out.help) {
        // pack help into content already
      }
    } catch (e) {
      results.push({ tool_call_id: tc.id, name, content: JSON.stringify({ error: e.message }) });
    }
  }
  return { results, actions, verifiedResults };
}

async function chat({ message, context, history = [] }) {
  // 1) Always try local assist first for help / simple calc / app actions
  const local = localAssist(message, context);
  if (local) {
    store.appendLog('info', 'ai.local', { msg: String(message).slice(0, 80) });
    return local;
  }

  if (!isConfigured()) {
    // Still answer with app knowledge offline
    const fallback = await TOOLS.get_app_info.handler({ topic: 'overview' });
    return {
      ok: true,
      reply: (fallback.help || '') +
        '\n\n(AI cloud chưa cấu hình — mở tab Settings để thêm API key. Máy tính và trợ giúp cơ bản vẫn dùng được.)',
      actions: [],
      verified: false,
      source: 'local-fallback',
    };
  }

  const c = cfg();
  const meta = PROVIDER_CATALOG.find((p) => p.id === c.provider) || PROVIDER_CATALOG.find((p) => p.id === 'custom');
  const baseUrl = (c.baseUrl || meta.baseUrl || '').replace(/\/$/, '');
  const system = buildSystemPrompt(context);
  const messages = [
    { role: 'system', content: system },
    ...history.slice(-6),
    { role: 'user', content: message },
  ];
  const toolDefs = Object.values(TOOLS);

  try {
    store.appendLog('info', 'ai.chat', { provider: c.provider, model: c.model });
    let data;
    if (c.provider === 'gemini' || meta.kind === 'gemini') {
      const toolHint = `\n\nWhen you need a tool, reply ONLY with JSON one of:
{"tool":"calculate","expression":"..."}
{"tool":"percentage","value":N,"percent":P}
{"tool":"get_app_info","topic":"overview|calculator|settings|feedback|logs|ai_panel"}
{"tool":"app_action","action":"clear_all|set_result|open_tab","value":"..."}
Otherwise reply normally in the user language.`;
      messages[0].content += toolHint;
      data = await callGemini({ apiKey: c.apiKey, model: c.model, messages });
      const raw = data.choices?.[0]?.message?.content || '';
      const jm = raw.match(/\{[\s\S]*"tool"[\s\S]*\}/);
      if (jm) {
        try {
          const j = JSON.parse(jm[0]);
          if (j.tool && TOOLS[j.tool]) {
            const out = await TOOLS[j.tool].handler(j);
            const actions = out.client_execute ? [out] : [];
            const verifiedResults = (out.verified && out.result != null) ? [out] : [];
            let reply = out.help || '';
            if (out.verified && out.result != null) {
              reply = `${out.expression || ''} = ${out.result}\n✓ Verified by Calculator Engine`;
            } else if (out.ok && out.action) {
              reply = reply || `Đã thực hiện: ${out.action}${out.value ? ' → ' + out.value : ''}`;
            } else if (out.error) {
              reply = out.error;
            }
            // strip JSON from any surrounding text
            const textAround = raw.replace(jm[0], '').trim();
            if (textAround) reply = textAround + '\n' + reply;
            return { ok: true, reply: reply.trim(), verifiedResults, actions, verified: verifiedResults.length > 0 };
          }
        } catch { /* fall through */ }
      }
    } else if (c.provider === 'anthropic' || meta.kind === 'anthropic') {
      data = await callAnthropic({ apiKey: c.apiKey, model: c.model, messages });
    } else {
      if (!baseUrl) throw new Error('No base URL for provider. Set Base URL in Settings.');
      data = await callOpenAICompat({
        baseUrl,
        apiKey: c.apiKey || 'local',
        model: c.model,
        messages,
        tools: toolDefs,
      });
    }

    let choice = data.choices?.[0]?.message;
    if (!choice) return { ok: false, error: 'Empty response from AI', verified: false };

    let toolResults = [];
    let actions = [];
    let verifiedResults = [];
    if (choice.tool_calls?.length) {
      const exec = await executeTools(choice.tool_calls);
      toolResults = exec.results;
      actions = exec.actions;
      verifiedResults = exec.verifiedResults;

      const followMessages = [
        ...messages,
        choice,
        ...toolResults.map((tr) => ({
          role: 'tool',
          tool_call_id: tr.tool_call_id,
          content: tr.content,
        })),
      ];
      const follow = await callOpenAICompat({
        baseUrl,
        apiKey: c.apiKey || 'local',
        model: c.model,
        messages: followMessages,
        tools: toolDefs,
      });
      choice = follow.choices?.[0]?.message || choice;
    }

    return {
      ok: true,
      reply: choice.content || '',
      verifiedResults,
      actions,
      toolResults: toolResults.map((t) => ({ name: t.name, content: t.content })),
      verified: verifiedResults.length > 0,
      source: 'llm',
    };
  } catch (e) {
    store.appendLog('error', 'ai.chat.fail', { error: e.message });
    // degrade to local if possible
    const again = localAssist(message, context);
    if (again) return again;
    return {
      ok: false,
      error: 'AI connection failed',
      detail: e.message,
      verified: false,
    };
  }
}

function status() {
  const pub = store.publicSettings();
  const configured = isConfigured();
  return {
    configured,
    provider: pub.provider,
    model: pub.model,
    mode: pub.mode,
    hasKey: pub.hasKey,
    maskedKey: pub.maskedKey,
    baseUrl: pub.baseUrl,
    catalog: catalogPublic(),
    localAssist: true,
    message: configured
      ? `AI ready (${pub.provider}${pub.model && pub.model !== 'auto' ? ' / ' + pub.model : ''})`
      : 'Local assist ON · Cloud AI: open Settings',
  };
}

module.exports = {
  chat,
  status,
  isConfigured,
  catalogPublic,
  TOOLS,
  PROVIDER_CATALOG,
  localAssist,
};
