# Snake Classic — Universal AI + Feedback

Snake Classic keeps its existing game UI, single AI button, unified panel, and app adapter. The server integrations now use the Universal AI + Feedback modules:

- AI server and provider engine: `ai-module/server/`
- AI browser helper: `public/ai-module/ai-module.js`
- Feedback server: `feedback-module/server/`
- Feedback browser helper: `public/feedback-module/feedback-module.js`
- Snake-specific knowledge and allowlisted actions: `lib/app-adapter.js`

The panel provides Chat, Feedback, Settings, and Logs. Settings support provider credentials, custom/local OpenAI-compatible endpoints, model discovery, and a connection test. AI actions are registered and validated on the server; browser-supplied action lists are ignored. Feedback Hub notices and support information are fetched by the server, and the ingest token is never included in browser responses.

AI keys are stored server-side under `data/ai-settings.json`. Configure Feedback Hub values through `SHFH_HUB_ID`, `SHFH_HUB_URL`, and `SHFH_INGEST_TOKEN`; the ingest token is intentionally not bundled and must be set in the server environment for feedback submission. Never put a Hub token in browser code. The app continues to use its existing `PORT`/`0.0.0.0` SoloHost deployment contract.

See `INTEGRATION_GUIDE.md` for the module API and security details. Run `npm test` for provider, module-contract, and SoloHost port compatibility checks.
