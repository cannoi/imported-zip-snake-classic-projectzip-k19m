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
