# Snake Arcade v2.7 — AI Auto Routing Upgrade Report

## Scope
Integrated the uploaded `ai-app-kernel v1.1.0` routing/local-AI features into the existing Snake Arcade AI integration while preserving the existing game, multiplayer, LAN, pause, UI and SoloHost structure.

## Implemented
- AI provider selection no longer requires the player to choose a provider.
- AI model selection no longer requires the player to enter a model.
- The server stores only the token; provider/model fields from old saved settings are ignored for routing.
- Kernel auto-detects common token formats and selects the matching provider.
- Kernel automatically selects a model from the provider's supported/default model list.
- Last successful provider/model is sticky and reused when still available.
- Model fallback remains enabled when the selected model fails.
- Supported cloud providers: OpenAI, DeepSeek, Groq, OpenRouter, Mistral, xAI, Gemini.
- Supported local providers: Ollama, LM Studio and generic local OpenAI-compatible endpoint.
- Local providers can operate without a cloud API key.
- Local endpoint environment variables are documented: `OLLAMA_BASE_URL`, `LMSTUDIO_BASE_URL`, `LOCAL_AI_BASE_URL`.
- AI status reports active provider/model without exposing tokens.
- Existing server-side token storage and optional admin PIN are preserved.
- Existing communication pause behavior is preserved.

## Compatibility fix made inside the kernel
The uploaded v1.1.0 router already contained token detection, but the kernel's `apiKey` path did not pass an explicitly entered token through token detection when no provider was supplied. The integration now uses `detectProviderFromToken(apiKey)` before falling back to the provider priority list. This is required for the promised "paste token only" behavior.

## UI changes
Removed the provider selector and model input from the AI token dialog. The player now pastes a token and uses **SAVE & TEST**. The displayed AI status shows the provider/model selected by the kernel after routing.

## Preserved
- Snake gameplay and rules
- Multiplayer/LAN flow
- Existing communication pause module
- Existing AI referee actions and read-only game data model
- Existing Docker/SoloHost architecture
- Existing token storage location and admin PIN behavior
- Existing chat and AI panels

## Verification
- `npm test`: PASS
  - communication-pause: 5/5
  - AI kernel self-test: 18/18
- AI routing UI/bridge checks: 7/7 PASS
- AI provider/local checks: 5/5 PASS
- Recursive JavaScript syntax scan: PASS
- Unsafe Docker setting scan: PASS (no docker.sock / privileged:true / host network found in scanned deployment files)
- ZIP/file inventory checked before packaging

## Not fully verified
A fresh `npm ci --ignore-scripts` was attempted but timed out after 45 seconds in this execution environment. The runtime dependencies were therefore not installed for a live Express/Socket.IO HTTP session. Consequently, real external cloud-provider calls and a real Ollama/LM Studio process were not claimed as end-to-end PASS. Local-provider behavior was verified with a deterministic fetch harness, and routing/provider selection was verified without external network calls.

## Files intentionally changed for this upgrade
- `ai-bridge.js`
- `ai-app-kernel/src/index.js`
- `ai-app-kernel/src/selftest.js`
- `public/index.html`
- `public/game.js`
- `AI_INTEGRATE.md`
- `.env`
- `tests/ai-routing.test.js`
- `tests/ai-provider.test.js`
- `UPGRADE_REPORT.md`

No other existing game behavior was intentionally changed for this upgrade.
