## 3.2.1
- Replaced the legacy AI and Feedback server modules with the Universal AI + Feedback modules.
- Added provider model refresh and connection test controls to the existing AI settings panel.
- Kept the existing Snake game, panel layout, and app adapter; tightened server-owned AI action and Feedback payload handling.
- Removed embedded Feedback Hub credentials; configure the server token through `SHFH_INGEST_TOKEN` and use `.env.example` for safe deployment defaults.

## 0.1.0

- Initial release generated from your idea.

## 2.2.0
- Nối lại theo ID phiên, AI lái khi offline, chuyển chủ phòng, danh sách phòng, vào giữa ván, ping, rate limit, SIGTERM.
- Kèm các tính năng 2.1.0: bot AI, độ khó, chế độ Màn chơi, skin Mờ dần/Chấm tròn, âm thanh.

## 2.3.0
- Nút cài đặt trong ván, hướng dẫn chơi, hướng dẫn lấy IP LAN, đếm ngược, tạm dừng, chơi lại, màn thắng/thua rõ ràng, .bat cho Windows, HUONG_DAN.md.

## 2.4.0
- English default + Vietnamese toggle.
- 12 campaign stages and 4 extra maps with themed colors.
- Lobby level preview; localized LAN/help.

## 2.5.0
- 20 campaign stages + 6 extra maps (spiral, diamond, forest, corners, checker, twin).
- AI referee (ai-app-kernel): /ai/* routes, local commentary, optional LLM chat.

## 2.6.0
- Auto public IP + WAN/LAN QR on PLAY/INVITE, refresh when IP changes.
- AI icon image, token prompt, room chat + virtual chip bets with AI house.

## 2.7.0
- AI: the AI button works (markup moved before scripts); no key => token dialog (provider/model/token, save & test, remove); kernel rebuilt on key change; token stored server-side only; `/ai/status`, `/ai/key`, `/ai/key/clear`; optional `AI_ADMIN_PIN`; 20 calls/min/IP limit.
- Chat: in-game chat (overlay feed, 💬 button / Enter), 7 emotes shown as bubbles above the snake, history for late joiners, throttling, `@ai <question>` answered by the kernel with room context. Typing in chat no longer steers or pauses the snake.
- Maps: 10 new maps (Spike Field, Mud Flats, Turbo Track, Clockwork Gates, Snowflake, Spike River, Pinball, Zigzag Hall, Octagon, Volcano) + Random. Campaign grows from 20 to 30 stages. New tiles: spikes (deadly), mud (slow), boost pad, timed gates.
- Fix: food/walls no longer spawn in sealed pockets (e.g. inside the closed Arena ring).
- Change: room chat no longer triggers the AI just because a message ends with "?" (only `@ai` / `/ai`).

## 2.8.0
- Gemini models updated (no retired 1.5 names). Billing/auth/model errors classified; DeepSeek 402 no longer looks like a bad token.
- Fallback across models then providers; friendly EN/VI messages. Uploaded AI icon.

## 2.8.1
- AI: ai-app-kernel upgraded to 1.1.1 (byte-identical); adapter adds `/ai/route`, `/ai/logo.png`, typed errors (`kind`), kernel version in status, sticky file in `DATA_DIR`, operator env keys recognised.
- Security: a user-entered token is no longer forwarded to other providers during fallback (see AI_KERNEL_1_1_1_REPORT.md).
- Tests: `tests/ai-kernel-111.test.js` (59 checks) added to `npm test`; smoke test now expects kernel 1.1.1.

## 2.9.0
- SoloHost Port Manager: no fixed public host port (see SOLOHOST_PORTS.md); `HOST_PORT` removed; invite URLs follow the browser's real port; Windows helper reads `docker compose port`.
- SoloHost Feedback Hub: in-game Feedback form, update banner, donate/payment report (see SHFH_INTEGRATE.md). `shfh-client.js` was not supplied - SDK loads from the Hub or from `public/shfh-client.js`.
- Tests: `tests/port-compat.test.js` (25) and `tests/feedback-hub.test.js` (31) added to `npm test`.

## 2.9.1
- Feedback Hub parameters (Hub ID, base URL, ingest token) built into `server.js`; no `.env` needed. Web-form fallback (`/feedback`) when the SDK cannot be loaded.
- SoloHost kit: `solohost/docker-compose.yml` (GHCR image, PORT/HOST env, no host port, data volume) and `solohost/config_options.yml` rewritten.

## 2.9.2
- Multiplayer invite URLs no longer fall back to internal container port 8080; they use the SoloHost public port from Host / X-Forwarded-Port / last socket handshake.
- Client rewrites stale :8080 invite links to the port the browser actually opened.
- Feedback donate rows compact + COPY on account numbers. App ID shown in Settings.

## 2.9.3
- Donate accounts shown in full (no clipped scroll box). App ID line removed from Settings.
- Feedback Hub notices/messages/replies polled every 45s and shown as banners + toast.

## 2.9.4
- ai-app-kernel 1.1.3. POST /api/settings/test-ai and /api/settings/peek-token. Check token button fills model list. Strong token hints never sent to the wrong provider.

## 3.0.0
- Unified AI button panel: Chat · Feedback · Settings · Logs (no second feedback system).
- AI button uses robot icon; unread Feedback Hub notices show a badge until opened.
- solohost-ai-provider-hub v1.0.0 for full provider catalog (incl. Anthropic + Custom).
- App activity log API for diagnostics inside Settings/Logs.
- Feedback donate accounts still come only from Hub sync (not hard-coded).
- SHFH Hub ID: SHFH-CANNOI-0905428801 (built-in, no user input).

## 3.0.1
- Fix AI key entry: save key first via /api/ai-hub/save (no live network required to store).
- /api/ai-hub/test never throws to the client; invalid keys return ok:false + warning.
- provider auto resolved from token (AIza→gemini, gsk_→groq, sk-or-→openrouter, sk-ant-→anthropic).
- Keys with whitespace trimmed; max length 500. Kernel reloadKey after hub save.

## 3.1.0
- Replaced AI/Feedback flow with the Futuristic Calculator pattern (lib/settings-store.js + lib/ai-gateway.js + /api/ai/settings|chat|status|catalog + /api/logs + SHFH proxy).
- Old ai-bridge and provider-hub-bridge are no longer mounted.
- Robot panel: Chat / Feedback / Settings / Logs. Donate accounts still come only from Hub sync.
