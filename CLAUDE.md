# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build, vanilla-JS front-end for managing guests at a XV años (quinceañera) event: `index.html` + `style.css` + `script.js`. There is no `package.json`, no bundler, and no test suite — this is the entire app. It's a client for a separate backend deployed at `https://backinvitacionc.vercel.app` (repo not included here).

## Running / developing

There is no build step. Open `index.html` directly in a browser, or serve the directory statically (e.g. `python3 -m http.server`) if you need it served over HTTP instead of `file://`. Changes to `script.js`/`style.css`/`index.html` take effect on refresh — no compilation, transpilation, or linting is configured.

## Architecture

**Single global script, no modules/framework.** `script.js` holds all app state in top-level `let` variables (`familias`, `mesas`, `amigos`, `editingId`, `editingAmigoId`, `currentMesaNumber`, `currentAmigoStatus`) and manipulates the DOM directly (`innerHTML` templates + `document.createElement`). There's no virtual DOM, no reactive framework — every state change is followed by an explicit `render*()` call.

**Three tabs, lazy-loaded:** Familias, Mesas, Amigos (`#tab-familias`, `#tab-mesas`, `#tab-amigos` in `index.html`). The Familias tab loads on initial page load; Mesas and Amigos are fetched on first click via the `loadedTabs` Set guard in the tab-click handler — don't assume `mesas`/`amigos` arrays are populated before their tab has been opened.

**All backend calls go through `apiRequest(path, { method, body })`** (script.js:4) — a thin fetch wrapper that JSON-encodes the body, throws on non-2xx using the server's `err.message`, and returns `null` for 204s. Any new endpoint call should go through this helper rather than calling `fetch` directly.

**Familias vs. Amigos are two intentionally disconnected flows**, mirrored from the backend design described in `correcion.md`:
- Familias are the CRUD-driven family/table records (`/guests`), always with a `count` of invited passes and optionally a `table` (1–24).
- Amigos (`/amigos`) are individual guests with no family/table. They arrive via two independent, non-merging paths: reception registers a contact with `POST /amigos` (status `pending`), or the guest self-confirms with `POST /amigos/confirmar` (creates a separate, already-`confirmed` record). The same person can legitimately have two rows — this is expected, not a bug.
- `GET /guests` mixes pending familias and pending amigos in one list; the front filters this client-side with `f.tipo === 'familia'` (see `loadFamilias()`) — do not remove that filter or the Familias tab will show amigos too.
- Despite `correcion.md` only documenting `POST /amigos`, `POST /amigos/confirmar`, and `GET /amigos`, `editAmigo`/`deleteAmigo` actually PATCH/DELETE `/guests/:id` — amigos live in the same backend collection as familias, just distinguished by `tipo`. Don't assume amigos need their own `/amigos/:id` endpoint; there isn't one in use here.

**Mesas (`/mesas`)** always returns all 24 tables (even empty ones) with their assigned familias embedded — clicking a table tile does not trigger another fetch, it just renders `mesa.familias` from the already-loaded `mesas` array (see `openMesaDetail`/`renderMesaDetail`). Amigos never have a table and never appear here.

**WhatsApp sending is manual, not automated, and the message is built client-side.** The backend computes a `whatsappLink` field on family/amigo records, but the front end ignores it — `renderWhatsappBtn()` (script.js:34) builds its own link from `telefono` and a message assembled by `buildInvitationMessage()` (script.js:19), which hardcodes the invitation copy and site URL. If the invitation wording needs to change, edit `buildInvitationMessage()`, not anything server-side. There's no bulk-send endpoint in active use — `POST /guests/enviar-invitaciones` exists on the backend but is intentionally not called from this front end (depends on an unapproved Twilio/WhatsApp Business account).

**Two "confirmed" quantities matter for familias**: `count` (invited passes) vs. `attendingCount` (how many of those are actually confirmed attending) — several render functions (`renderList`, `renderCheckinModal`) fall back to `count` when `attendingCount`/`confirmados` is not yet set, since a family can be `pending`, `confirmed`, or `declined`.

**Validation is duplicated client-side** to match backend constraints before submitting, so failures surface immediately in the form rather than as a generic API error: `validTable()` enforces table numbers 1–24, `validTelefono()` enforces exactly 10 digits. Keep these in sync with the backend's rules described in `correcion.md` if either changes.

**`correcion.md` is the API reference for this front end** — it documents the backend endpoints (`/guests`, `/mesas`, `/amigos`, `/amigos/confirmar`, `/resumen`), field-level contracts, and known gotchas (e.g. `/resumen` isn't in `script.js`'s original endpoint list from `correcion.md` but is already used by `loadResumen()`). Consult it before changing any API call shape.
