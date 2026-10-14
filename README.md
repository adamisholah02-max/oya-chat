# Oya — Meet your people

Nigeria-focused random text and video chat. Built with React, Vinext, TypeScript, Cloudflare Workers and D1. This repository contains the complete source of the early-access build, including its original branding and responsive UI.

## Features

- Random text matching with shared interests and optional self-selected city.
- Text conversations, Next person, and End chat.
- WebRTC video beta with camera and microphone controls.
- Report and browser-session blocking.
- 18+ self-confirmation, community rules and privacy information.
- D1 schema migrations and automated chat API tests.

## Status

This is an early beta, not a production-ready moderated service. Backend tests and TypeScript checks passed. A live two-device video call and browser layout QA have not been verified. There are no seeded users or fake conversations: matching requires another active browser session.

City is self-selected, displayed to the other person and does not filter matches. The site is Nigeria-focused; it does not enforce country-based access restrictions.

The original Sites deployment is private. Publishing this repository does not change that deployment's audience or copy its database.

## Requirements

- Node.js 24 or later (the tests use node:sqlite).
- pnpm 11.25.0, matching packageManager and the committed lockfile.
- A Cloudflare account for a separate hosted deployment.

## Install and check

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
```

The lockfile retains the original starter dependencies. No credentials, session records, reports, or chat messages are included in this repository.

## Local development

Build once, then initialize the local database:

```bash
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_burly_mauler.sql
pnpm dev
```

Use localhost for browser testing. Apply each later migration only once to a given local database. Local and remote databases are separate. Two separate browser profiles are needed to test matching because tabs in one profile share the session cookie.

## Publish on Cloudflare Workers

This app depends on Workers and a D1 binding named DB. It cannot run on GitHub Pages. It is not a drop-in Vercel project; that would require adapting the backend and database access.

1. Authenticate and create an empty D1 database:

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create oya-chat-db
```

2. Copy the returned database ID. Set OYA_D1_DATABASE_ID in your terminal or build environment. This identifier is not an API token.

Bash/macOS/Linux:

```bash
export OYA_D1_DATABASE_ID="your-real-database-id"
```

Windows PowerShell:

```powershell
$env:OYA_D1_DATABASE_ID="your-real-database-id"
```

3. Build and publish:

```bash
pnpm build
pnpm deploy
```

The deploy script validates the database ID, configures the generated Worker, applies remote schema migrations, and deploys the Worker. Wrangler prints the live URL. This creates a separate public workers.dev deployment; it does not alter the private Sites instance. Do not deploy this beta publicly until the launch requirements below are resolved.

For Cloudflare Git integration, select this repository and main branch, set OYA_D1_DATABASE_ID as a build environment variable, use `pnpm build` as the build command and `pnpm deploy` as the deploy command. Authenticate through Cloudflare's supported integration. Never commit API tokens to source control.

References:
- https://developers.cloudflare.com/workers/wrangler/commands/d1/
- https://developers.cloudflare.com/d1/reference/migrations/

## Before public launch

- Configure authenticated TURN relaying for video on restrictive networks; this beta currently uses STUN only. Test calls across devices and Nigerian mobile networks.
- Add staffed moderation, report review tools, effective identity/abuse enforcement and stronger age assurance. Reports currently persist without a moderation dashboard. Blocks apply only to the browser session identity and can be bypassed by clearing cookies.
- Add deployment-level rate limiting and abuse protections. The existing per-session text-send throttle is not comprehensive protection.
- Implement scheduled retention cleanup and data deletion procedures. Currently, messages and video connection signals older than 24 hours are deleted when a new chat starts. Session records and reports are retained.
- Review privacy and operational policies for the actual service. Text chat is not end-to-end encrypted. Direct peer-to-peer video can expose participant IP addresses. Another participant may record a call even though this app does not record it.
- Verify mobile/desktop layout, accessibility, disconnected sessions, camera permissions and end-to-end video behavior in real browsers.

## Project structure

- `app/page.tsx`: landing page, preferences, chat UI and WebRTC handling.
- `app/api/chat/route.ts`: session, matching, messaging, reporting and signaling API.
- `app/globals.css`: responsive visual design.
- `db/schema.ts`, `drizzle/`: database schema and migrations.
- `tests/chat-api.mjs`: API tests using SQLite and a D1-compatible adapter.
- `scripts/prepare-cloudflare.mjs`, `scripts/deploy-cloudflare.mjs`: external deployment helpers.
- `build/`, `scripts/`, `components/`, `lib/`: retained framework support and starter components.

The hosting manifest intentionally omits the original private Site's project ID. Existing third-party license notices are retained.
