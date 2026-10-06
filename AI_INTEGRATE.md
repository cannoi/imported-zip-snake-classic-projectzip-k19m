# Integrate AI App Kernel (Snake Arcade) — v2.8.1 (kernel 1.1.1)

Module folder: `ai-app-kernel/` (src kept intact). Adapter: `ai-bridge.js` (CommonJS -> loads the ESM kernel with `import()`).

## What the AI does here
The kernel is the room **referee / attendant**:
- reads rooms + high scores (no second database, collections `rooms`, `scores` only, read-only)
- actions: `list_rooms`, `room_status`, `announce`, `call_winner`
- rule-based calls (stage start, player out, winner) work **without** any key
- players ask it in room chat: `@ai who is winning?` (also the **AI** button, bottom-right)

## Adding the token (no file editing needed)
1. Tap the **AI** button. If no token is configured, a dialog asks for one.
2. Paste the token and press **SAVE & TEST**. You do not choose a provider or model; the kernel detects the provider from the token and automatically selects/falls back to a working model.
3. Supported cloud providers include OpenAI, DeepSeek, Groq, OpenRouter, Mistral, xAI and Gemini. Local OpenAI-compatible AI is also supported through Ollama, LM Studio or a custom local endpoint.
4. The server tests it with one call. A rejected token is removed again automatically.
The token takes effect immediately (the kernel is rebuilt), is stored only on the server (`DATA_DIR/ai-key.json`, mode 600, in the Docker volume) and is never sent back to any browser or logged.
Cancel the dialog to keep using the local referee.

## HTTP
`GET /ai/status` `POST /ai/key` `POST /ai/key/clear` `GET /ai/health` `GET /ai/schema` `GET /ai/capabilities` `POST /ai/chat` `POST /ai/act`
New with kernel 1.1.1: `GET /ai/route` (provider/model currently auto-selected, no secrets) and `GET /ai/logo.png` (AI button logo, used as icon fallback).
`POST /ai/chat` errors now carry `kind`: `auth` | `billing` | `model` | `rate` | `other` (bilingual message from the kernel; the token is always redacted).

## Env (optional; the UI token wins over these)
```
# Optional hard locks; leave unset for automatic routing
# AI_PROVIDER=openai
# AI_MODEL=gpt-4o-mini
AI_API_KEY=
# Local AI (no cloud token required when configured)
# OLLAMA_BASE_URL=http://127.0.0.1:11434/v1/chat/completions
# LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1/chat/completions
# LOCAL_AI_BASE_URL=http://127.0.0.1:11434/v1/chat/completions
AI_ADMIN_PIN=      # if set, /ai/key and /ai/key/clear require it
```
Also accepted: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `XAI_API_KEY`, `GEMINI_API_KEY`, `PROVIDER_API_KEY`.

## Safety
- **Key isolation (new):** the kernel forwards the `apiKey` option to *every* provider it falls back to (verified: an OpenAI key was sent to api.deepseek.com). `ai-bridge.js` therefore never passes `apiKey`; the token is exposed only as the env variable of its own provider (`<PROVIDER>_API_KEY`, restored when the key changes or is cleared), so each vendor only ever receives its own key.
- Sticky routing state is stored in `DATA_DIR/ai-sticky.json` (provider/model only, no secrets) instead of the app root.
- No host/Docker commands, no table drop, allowlisted read-only collections.
- Chat text is untrusted input: the system prompt tells the model to ignore instructions to reveal keys or change rules; write/delete tools are refused by the store.
- Limits: 20 AI calls/minute per IP on `/ai/chat`, one `@ai` answer per room every 3 s.
- Anyone on your LAN who opens the game can set the token unless you set `AI_ADMIN_PIN`.

## Why the AI button was dead before (fixed in 2.7)
`#ai-box` sat after `<script src="game.js">`, so the script ran before the button existed and never attached its click handler. The markup now precedes the scripts and the init also waits for DOMContentLoaded. The kernel also captured an empty key at start-up, so a token entered later was ignored; it is now rebuilt when the key changes.
