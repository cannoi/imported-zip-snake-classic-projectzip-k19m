# Snake Arcade AI + Communication Pause Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate AI kernel v1.1.0, add safe communication-driven solo pause/resume, and verify the existing game remains intact.

**Architecture:** Keep `ai-bridge.js` as the game-specific adapter and copy the supplied portable kernel source/assets wholesale. Add a small browser communication-pause controller used by `game.js`; it only emits the existing server `pause` event and never changes multiplayer server semantics.

**Tech Stack:** Node.js 18+, Express, Socket.IO, browser JavaScript, portable ESM AI kernel.

**Spec:** `docs/superpowers/specs/2026-09-30-snake-ai-upgrade.md`

## Global Constraints
- Preserve existing game architecture and features.
- Use supplied `ai-app-kernel` v1.1.0.
- Keep secrets server-side.
- Auto-pause only for one-human rooms.
- No Docker/host privilege changes.

## Review Focus
- AI route resolution with an explicitly entered token and provider.
- Local fallback when no key is configured.
- Chat opened while already manually paused must not resume unexpectedly.
- Chat and AI panel overlapping must pause only once and resume only after both close.
- Multiplayer chat must not pause the shared game.

---

### Task 1: Communication pause controller

**Files:**
- Create: `public/communication-pause.js`
- Test: `tests/communication-pause.test.js`

**Interfaces:**
- Produces `window.SnakeCommunicationPause.create(options)` in browser and CommonJS-compatible export for tests.

- [ ] Write failing tests for first-open pause, last-close resume, manual-pause preservation, overlap, and multiplayer denial.
- [ ] Run `node tests/communication-pause.test.js` and confirm the missing module causes the expected failure.
- [ ] Implement the minimal controller with `open(source)`, `close(source)`, and `reset()`.
- [ ] Run the test again and confirm all assertions pass.

### Task 2: Integrate supplied AI kernel v1.1.0

**Files:**
- Replace: `ai-app-kernel/src/*` with supplied v1.1.0 source.
- Add: `ai-app-kernel/assets/ai-logo.png`.
- Modify: `ai-bridge.js` only where needed for v1.1 routing/status compatibility.

**Interfaces:**
- Existing game calls to `aiApi.ask()` remain unchanged.
- `/ai/status`, `/ai/chat`, `/ai/key`, `/ai/key/clear` remain compatible.

- [ ] Add a source-level regression test asserting v1.1 files (`router.js`, `brand.js`, `selftest.js`) exist and bridge imports the new kernel.
- [ ] Run syntax/self-test checks before modifications where applicable.
- [ ] Copy the supplied v1.1 kernel and logo without rewriting unrelated game code.
- [ ] Update bridge status to expose safe route metadata if available.
- [ ] Run kernel self-test and syntax checks.

### Task 3: Wire chat/AI pause-resume

**Files:**
- Modify: `public/game.js`
- Modify: `public/index.html` only to load `communication-pause.js` before `game.js`.

**Interfaces:**
- Existing `socket.emit('pause')` remains the sole server pause mechanism.
- `SnakeCommunicationPause` tracks `chat`, `ai`, and `ai-modal` sources.

- [ ] Add integration assertions for source loading and hooks.
- [ ] Run static/syntax tests before changes.
- [ ] Instantiate the controller using current `playing`, `room`, `st`, and `socket` state.
- [ ] Open/close room chat and AI UI through the controller.
- [ ] Ensure manual pause is never auto-resumed.
- [ ] Ensure multiplayer never emits pause.
- [ ] Run browser-script syntax checks.

### Task 4: Settings hardening without feature loss

**Files:**
- Modify: `public/game.js` only where existing settings behavior is incomplete.
- Modify: `public/index.html` only if an existing standard setting needs a missing control.

- [ ] Add tests/assertions for persisted sound, vibration, chat overlay, profile, language, fullscreen and pause behavior.
- [ ] Preserve existing controls and localStorage keys.
- [ ] Avoid speculative new settings that alter gameplay balance.
- [ ] Verify settings panel and in-game pause paths.

### Task 5: Full verification and package

**Files:**
- Create: `tests/upgrade-smoke.test.js`.
- Create: `UPGRADE_REPORT.md`.

- [ ] Run all Node syntax checks over server and browser JS.
- [ ] Run AI kernel self-test.
- [ ] Run all upgrade tests.
- [ ] Run `npm test`.
- [ ] Start the server locally and verify `/`, `/api/info`, `/ai/status`, and Socket.IO HTTP handshake.
- [ ] Scan archive contents for missing kernel files, Docker socket/privileged settings, duplicate old kernel source, and accidental secrets.
- [ ] Build the final ZIP and verify it can be extracted cleanly.
- [ ] Record completed/not-completed items and any required changes in `UPGRADE_REPORT.md`.
