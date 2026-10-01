# SoloHost Feedback Hub - integration (Snake Arcade 2.9)

## What is wired
- Settings (gear) -> **FEEDBACK**: type (bug / idea / other), message (max 1000), optional 1-5 stars -> `hub.sendFeedback({type, message, rating})`.
- On open: `hub.sync()`. If `snap.update.needed` a banner appears in Settings; **GOT IT** calls `hub.markUpdateSeen(item.id)`.
- `snap.donate` (Pi / MB Bank from the Hub) is shown as plain text; **REPORT PAYMENT** calls `hub.reportPayment({txn_id, method, amount})` and re-syncs. `unpaid_nudge` shows one gentle line in Settings only (never during a game); `payment_ok` / `thanks` show a toast.
- Only what the player types is sent. Nothing from the game, the AI token or the browser storage is read or sent.

## Built-in Hub (nothing to declare)
`server.js` carries the Hub parameters as defaults: Hub ID `FH-CANNOI-0905428801SH`, base URL `http://14.176.78.46:8090`, ingest token (client token), app id `snake-arcade`. `GET /api/shfh-config` hands them to the browser. `SHFH_*` variables in `.env` override them.
**Security note:** the ingest token is a client token, so anyone who opens the game (or the repository) can read it. It only lets them post feedback to your Hub; rotate it in Hub Settings if it is abused.

## SDK source (first that works)
1. `<hubUrl>/api/sdk.js` from the Hub (skipped on https pages: an https page cannot call the http Hub)
2. `public/shfh-client.js` - copy the SDK file here for offline use (not supplied so far, slot is empty)
3. neither -> the **FEEDBACK** button opens the Hub web form `http://14.176.78.46:8090/feedback` in a new tab. Players without internet access cannot reach the Hub at all (it is a public IP).

## Configuration (.env, all optional)
```
SHFH_HUB_URL=http://14.176.78.46:8090  # built-in default
SHFH_INGEST_TOKEN=                     # same as Hub Settings -> Ingest token (visible to browsers by design of the SDK)
SHFH_APP_ID=snake-arcade
SHFH_APP_NAME=Snake Arcade
SHFH_ENABLED=1                         # 0 = turn the integration off
```
`GET /api/shfh-config` returns these plus `version` (from package.json) and `platform: "solohost"`.

## Verified / not verified
Verified with a MOCK of the documented SDK (31 checks): loader order, create() options, sync, feedback, update ack, donate, payment, error display, locale.
**Not verified:** the real `shfh-client.js` and a real Hub (neither was provided). Assumptions to confirm on the Hub: accepted `type` values (bug / idea / other), `method` values for `reportPayment`, and the exact fields of `snap.update.item` / `snap.donate` (the UI only reads flat text and is defensive).
