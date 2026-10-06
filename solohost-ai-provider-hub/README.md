# @solohost/ai-provider-hub

Standalone AI provider + model module for **any SoloHost / Pi Network app**.

Connect keys once, discover models (`auto` for Personal AI Hub), call chat completions.

```js
import { AIProviderHub } from '@solohost/ai-provider-hub';

const hub = new AIProviderHub({ cfg: { dataDir: './data', ai: {} }, db, log: console });
const probed = await hub.testConnection({
  provider: 'custom',
  apiKey: process.env.PAH_KEY,
  baseUrl: 'http://personal-ai-hub:8080/v1',
});
// probed.verifiedModel === 'auto'
```

Supports: Gemini, DeepSeek, OpenAI, Anthropic, OpenRouter, Groq, Mistral, xAI, Custom OpenAI-compatible.
