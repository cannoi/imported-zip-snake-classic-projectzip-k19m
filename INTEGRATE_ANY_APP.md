# Integrate ai-app-kernel into any Node app (fast)

Copy folder `ai-app-kernel/` as-is (`src/` must stay).

```js
import { createAiKernel, createActionRegistry, createCustomStore } from './ai-app-kernel/src/index.js';
// CJS app:  const { createAiKernel } = await import('./ai-app-kernel/src/index.js');

const store = createCustomStore({ /* listCollections, list, get, put, delete mapped to YOUR db */ });
const actions = createActionRegistry()
  .register({ name: 'hello', description: 'Ping', parameters: { type: 'object', properties: {} }, run: async () => ({ ok: true }) });

const ai = createAiKernel({ store, actions, schema: { name: 'my-app', collections: [{ name: 'items', fields: ['id'] }] } });
ai.mount(app, '/ai');   // GET /ai/health /schema /capabilities  POST /ai/chat /ai/act
```

Env: `AI_PROVIDER`, `AI_MODEL` (optional), `AI_API_KEY` or `OPENAI_API_KEY` / `GEMINI_API_KEY` / `DEEPSEEK_API_KEY`…

Leave **model empty** so the kernel tries current models, then `/models` discovery.

| HTTP | Meaning | What kernel does |
|------|---------|------------------|
| 401/403 | Bad token | Stop that provider, tell user to check key |
| 402 | No credit (DeepSeek etc.) | Do not retry models; switch provider or local referee |
| 404 model | Retired name (Gemini 1.5) | Normalize + try 2.5-flash / 2.0-flash |
| 429 | Rate limit | Switch provider if another key exists |

Never log keys. Allowlist collections. Do not expose shell.

This game uses `ai-bridge.js` as the CJS adapter + `/ai/key` UI.
