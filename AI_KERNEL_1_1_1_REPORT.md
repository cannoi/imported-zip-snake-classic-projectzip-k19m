# AI Kernel 1.1.1 integration report (Snake Arcade 2.8.1)

## What changed
- `ai-app-kernel/` replaced by the uploaded **v1.1.1 (FIXED)** package, byte-identical (src/, assets/, docs kept intact). Versus 1.1.0 already inside the app: `mount()` now passes `invoke` (so `POST /ai/act` works), typed errors (`err.kind`, HTTP 502 for auth/billing), `/ai/route`, `/ai/logo.png`, new exports, self-test 21/21 (was 18/18).
- `ai-bridge.js` (only adapter file touched): typed error handling from the kernel, `/ai/route`, `/ai/logo.png`, kernel version in `/ai/status` and `/ai/health`, sticky file in `DATA_DIR`, env keys such as `OPENAI_API_KEY`/`GEMINI_API_KEY` now count as "AI configured" (the docs already promised this), and the key-isolation fix below.
- `public/game.js`: one line - the AI icon falls back to `/ai/logo.png` before the generic image.
- `tests/upgrade-smoke.test.js`: pinned kernel version `1.1.0` -> `1.1.1`. New `tests/ai-kernel-111.test.js` (59 checks) added to `npm test`.

## Security finding (kernel behaviour, worked around in the adapter)
`createAiKernel({ apiKey })` sends that key to every fallback provider. Reproduced: with `DEEPSEEK_API_KEY` set by the operator and a user-entered OpenAI key that returns 401, the kernel called `api.deepseek.com` with `Bearer <the OpenAI key>`. The kernel `src/` was not edited (as required); the adapter avoids the option and injects the key through its own provider's env variable instead. Recommended upstream fix: use `keys[provider]` (not `apiKey`) for providers other than the primary one.

## Other observations (not changed)
- `ai-app-kernel/assets/ai-logo.png` is really a JPEG; `/ai/logo.png` therefore sends the true content type.
- Running the kernel's own tests creates `.ai-kernel-sticky.json` in the working directory (now git/docker-ignored).

## Not verified
No real cloud provider, Ollama or LM Studio call was made (no network/keys here); provider traffic is mocked. Docker and a live Express/Socket.IO session were not run.
