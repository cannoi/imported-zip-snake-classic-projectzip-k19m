# AI Connection Fix Report

## Root causes found

1. The previous UI had removed Provider/Model selection entirely. The bridge therefore saved only the token and always rebuilt the kernel with an empty provider/model.
2. Saved AI configuration discarded `provider`, `model`, and custom/local `baseUrl`, so a selected provider or local endpoint could not reliably survive a restart.
3. A saved local configuration with no cloud token was rejected when loading because the bridge only loaded saved keys of length >= 8.
4. The kernel treated an explicitly entered model as the only model. If that model was retired, renamed, unavailable, or wrong, it stopped instead of trying another working model.
5. The kernel rebuild signature did not include the Base URL, so changing a local/custom endpoint could leave an old kernel instance connected to the previous endpoint.
6. Static model catalogs can become stale. After all known candidates fail, the kernel now asks the provider for its current model list and retries untried models.

## Changes

- Restored Provider selector with Auto/Detect option.
- Restored optional Model field.
- Added optional Local/Custom Base URL field.
- Empty Model means automatic selection.
- Entered Model is tried first, then known fallback models.
- If static candidates fail, current provider model discovery is attempted.
- Local providers support no token when configured: Ollama, LM Studio, Local OpenAI-compatible.
- Saved provider/model/base URL are preserved server-side.
- Kernel rebuilds when provider, model, key, endpoint, or local availability changes.
- Existing game, multiplayer, chat/pause, room, LAN and referee features were not intentionally changed.

## Provider model discovery

Supported discovery paths include OpenAI-compatible `/models`, Gemini model listing, Ollama `/api/tags`, and LM Studio/local `/models`. Discovery is only attempted after the configured/static candidates fail, reducing normal-request overhead.

## Verification

`npm test` result:

- communication-pause: 5/5 passed
- AI routing UI/bridge regression: PASS
- AI model fallback/discovery regression: PASS
- AI provider/local checks: 5/5 passed
- upgrade-smoke: 10/10 passed
- AI Kernel self-test: 18/18 passed
- JavaScript syntax scan: PASS for all 19 JS files

## Not fully verifiable in this environment

A real external cloud-provider request cannot be certified without a valid user API key and Internet access to that provider. The connection path, fallback logic, local provider path, and model discovery are tested with deterministic fetch harnesses. Docker/HTTP full-stack E2E is not claimed here.
