# Orbital Pact 4.0 Recovered Development Snapshot

This archive preserves the unfinished 4.0 source code recovered from the interrupted development session. It is not a finished public multiplayer release. See `STATUS-4.0.txt` for the handoff and known gaps. Some in-game labels describe features that are still incomplete.

Orbital Pact is a browser strategy game about satellites, contracts, global infrastructure, research, diplomacy and orbital competition.

## Play locally

Extract the complete ZIP and open `index.html` in Chrome. No installation is required. Solo mode, AI rivals and offline practice lobbies work without an internet connection.

## Systems present in the source, with implementation gaps

- Persistent solo campaigns without a forced timer
- Four difficulty settings and four victory conditions
- Four active rival corporations that expand across the map
- Visible territory control, rival satellites, player relays and live rankings
- Fifteen research nodes across five technology branches
- Fleet upgrades, contracts, satellite launches, repairs and world events
- Alliance pacts, donations, joint projects and three strategic operation types
- Orbital defenses, fog of intelligence and operation cooldowns
- Match end screen, ranking and rematch flow
- Guest identities in `Anon####` format and editable local profiles
- Public lobby browser, quick join, custom settings and reconnect metadata
- Responsive Chromebook, desktop and mobile layout

## Planned online setup after implementation is completed

The steps below describe the intended configuration. Configuration alone does not complete multiplayer. The current client still runs a local simulation. Live mode is disabled pending integration; the draft Worker now rejects client-provided contract rewards. Authentication, shared match simulation, reconnect, permissions and integration tests remain unfinished. Do not treat the backend as a production-ready match server.

1. Create a dedicated Supabase project.
2. Enable anonymous sign-ins under Authentication settings.
3. Run `backend/supabase/schema.sql` in the SQL editor.
4. Put the public project URL and public anon key in `js/orbital-config.js`.
5. Deploy `backend/cloudflare/worker.js` with `wrangler.toml.example`.
6. Put the deployed Worker URL in `matchServerUrl` inside `js/orbital-config.js`.

The browser contains draft Supabase requests for anonymous sessions and lobby discovery, creation and membership. Named profiles are currently local. The Worker has draft state and action handling, but that state is not yet the authority for the complete browser game. Shared simulation and complete authentication remain unfinished.

## Hosting work still to complete

No public deployment or domain configuration was performed for this snapshot. Complete the online implementation and integration testing before publishing multiplayer. The included hosting files are drafts and still require the chosen domain and deployment configuration.

## Tests

Run these commands from this folder:

```text
node tests/regression.cjs
node tests/v3-systems.cjs
node tests/v4-strategy.cjs
node tests/v4-recovery.cjs
```

These three Node.js suites require no package installation. All 41 checks passed after recovery, including nine new behavioral recovery tests. They do not establish complete browser behavior, deployed multiplayer, secure accounts or correct implementation of every advertised research effect. The included Playwright browser smoke script has not been successfully verified in this session.

Recovery changes: research effects, donor/recipient balances, all rival victory routes, company valuation, defensive effects, endless continuation and pace settings. See STATUS-4.0.txt for the remaining work. No deployment was made in this recovery round.
