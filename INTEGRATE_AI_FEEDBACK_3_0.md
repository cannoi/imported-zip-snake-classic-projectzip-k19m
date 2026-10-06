# Snake Arcade 3.0 — AI + Feedback unified panel

## Modules integrated
- **solohost-ai-provider-hub v1.0.0** — provider catalog (OpenAI, Gemini, DeepSeek, Anthropic, OpenRouter, Groq, Mistral, xAI, Custom), testConnection, encrypted credential vault. Keys mirrored into existing `ai-key.json` so chat stays one system (ai-app-kernel tools + actions).
- **solohost-feedback-hub v2.3.0** — `public/shfh-client.js` + panel Feedback tab. Built-in Hub: ID `SHFH-CANNOI-0905428801`, URL `http://14.176.78.46:8090`, ingest token baked into server (no user input).

## UX
- One floating robot button (uploaded icon). Badge = unread Hub notices; clears when Feedback tab is opened.
- Tabs: **Chat** | **Feedback** | **Settings** | **Logs**
- Feedback: Hub notices, donate accounts from `hub.sync()` only, free-text feedback form, optional payment report.
- Settings: full provider list incl. Custom + Anthropic, CHECK token, SAVE & TEST, REMOVE KEY.
- Logs: `/api/app-log` ring buffer of app activity + console errors.

## AI knowledge
- System prompt covers modes, maps, multiplayer, LAN, Feedback, Settings.
- Tools: list_rooms, room_status, announce, call_winner, how_to_play, high_scores.

## Not dual systems
- Old Settings FEEDBACK button and fb-modal removed.
- Chat still goes through `/ai/chat` (kernel). Provider hub is the connection/settings layer.
