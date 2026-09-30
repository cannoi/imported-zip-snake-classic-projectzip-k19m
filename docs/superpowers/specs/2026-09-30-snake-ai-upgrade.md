# Snake Arcade AI + Communication Pause Upgrade

## Goal
Integrate `ai-app-kernel` v1.1.0 into Snake Arcade v2.7 without rewriting the existing game architecture, make AI chat reliable, pause a solo game while chat/AI communication UI is open, and tighten standard player settings without removing existing features.

## Constraints
- Preserve existing multiplayer, LAN/WAN invite, maps, scoring, modes, controls, Docker/SoloHost structure, and current UI except where required.
- Replace the bundled AI kernel implementation with the supplied v1.1.0 implementation, including router/brand/self-test files and logo asset.
- Keep API keys server-side and redacted from responses/logs.
- Auto-pause only when the room has one human player; multiplayer remains server-synchronized and cannot be paused for one client without changing multiplayer semantics.
- Do not introduce host Docker access or privileged settings.

## Success Criteria
1. `/ai/chat` uses the v1.1.0 kernel and its routing/fallback capabilities.
2. AI status exposes the resolved route/model information without exposing credentials.
3. Opening either room chat or AI panel during a solo game pauses once; closing all communication UI resumes only if the pause was caused by that UI.
4. Existing manual pause remains respected.
5. Existing game settings remain intact; useful standard settings are retained and persisted.
6. Kernel self-test, syntax checks, application tests, and a local start/HTTP smoke test pass.
