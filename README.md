# Orbit Pact 3.0

Build a satellite company, complete contracts and expand your fleet.

[Play Orbit Pact](https://lukasoudorp-cmd.github.io/spacegame/)

## New in 3.0: Orbital frontier

New solo games are endless, with pause and 1x/2x/4x speed. Existing solo matches upgrade without losing the company. There is no revenue or time cutoff. Online lobbies still support 2–4 people, but new matches now end when a company holds 7 of 12 network regions continuously for 45 seconds. Existing v1 online rooms retain their old rules.

- Click a country marker to connect a region (EUR 6,000 / 10 seconds). Each satellite supports two regions. Regions pay EUR 600 per level per 5 seconds, up to level 3.
- After the 90-second opening truce, contest rivals' regions for EUR 12,000 + EUR 4,000 per defender level. You need more satellites than the region level; the takeover takes 20 seconds. The owner can defend for EUR 4,000 and gain 30 seconds of regional protection.
- A research lab permits signal disruption for EUR 10,000. It suspends the target's network income for 20 seconds (10 with a defense building). Headquarters income continues. Attacks have a 60-second cooldown and the victim receives 60 seconds of immunity from further disruption.
- A EUR 6,000 shield lasts 60 seconds, immediately restores disrupted signals and blocks new sabotage and new takeover attempts. Existing takeover attempts still need the Defend region action.
- The isometric spaceport shows real buildings, cranes, service vehicles and launch animations. Sites support three building levels. Solar levels add power, pad levels shorten launch preparation and lab levels shorten contracts.
- Scout, Relay and Mapper payloads add fleet capacity, passive income or contract bonuses. A level 2 factory, level 2 lab and six satellites unlock an orbital station, which adds EUR 2,000 income per level per 5 seconds.
- Priority requests rotate every 90 seconds, with a 45-second acceptance window. Each company can take one per window. Bot difficulties change response speed, contract selection and sabotage behavior.
- Inspect companies to see their actual spaceport. Company headquarters are labelled on the network map. Activity history and milestones track visible growth.

Controls: World network / My spaceport tabs, clickable network markers (or the country dropdown), selectable building sites with keyboard support, and a payload choice in the spaceport inspector. Existing free play is available from the main menu.

The server controls online time, balances, territory ownership, defenses and victory. Passive income is integrated across completion times so a delayed reconnect cannot retroactively multiply earnings. Test coverage: `node tests/strategy.cjs`, `node tests/match-client.cjs`, the generated `supabase/tests/frontier-replay.sql` (20 server/solo states), and `supabase/tests/frontier-security.sql` (RPC isolation and retries, all fixtures rolled back). Generate the replay with `node tests/frontier-replay.cjs`. Apply `supabase/migrations/20260912_orbital_frontier.sql` after the original multiplayer migration.

This is a casual, private-lobby strategy mode. Public matchmaking, online lobby bots, chat, alliances and account-based cross-device match recovery are not included. Solo saves remain local; online lobbies expire after 48 hours. The game remains an original space-company simulation with abstract, fictional signal disruption.

## New in 2.4

The start screen offers Multiplayer (create/join with an eight-character code), Solo vs bots (easy/normal/hard), and the existing Free play company.

Competitive matches are a separate ruleset: 2–4 online companies or one player against three bots, equal EUR 100,000 starting funds, one satellite, a 16-plot base, and a shared contract market. First to EUR 250,000 gross contract revenue wins. After 30 minutes the highest revenue wins; exact ties use stable player ID order. Build a factory and pad to produce and launch satellites; solar adds power and a lab reduces mission times. Bot difficulty changes decision intervals and contract selection, not starting money.

Online time, money, ownership and winners are calculated in Postgres. The browser sends commands rather than financial state. Updates poll every 2.5 seconds. A private 256-bit player token is separate from the shareable lobby code; only its hash is stored in the membership table. Command sequence numbers prevent a retry from charging twice. Tables have RLS enabled and no direct anonymous access. Lobbies expire after 48 hours. Returning to the menu does not stop an online match. Resume online lobby reconnects on the same browser. Online matches are not copied into the old cloud-save slot.

Solo matches save separately on this device and stop while hidden or in the menu. Existing sandbox saves are preserved. Run `node tests/matches.cjs` and the rollback-only `supabase/tests/multiplayer.sql` for match coverage. Migration: `supabase/migrations/20260912_multiplayer.sql`.

Known scope: no chat, matchmaking queue, cross-device player login, ranked ladder, or bots inside online lobbies. This is the first competitive match mode, alongside the fuller free-play progression.

## New in 2.3.1

Spaceport now includes a country picker with validated land coordinates. Choose land on map opens the flat map and returns directly to founding after a valid click. A labelled dot marks the selected location and the founded company. Show my company focuses the exact saved location; loading also centres the globe on your company.

## New in 2.3

- Found a named company at an actual land coordinate selected on the globe or world map.
- Free headquarters and four starting plots, expandable to a 5 by 5 spaceport.
- Build solar arrays, satellite factories, launch pads, research campuses and mission control.
- Construction reserves power and completes over game time.
- Manufacture satellites at 70% of external cost, then command a launch from your own pad.
- Research campuses produce research; mission control accelerates future factory orders.
- Existing orbital fleets remain available. External suppliers still offer immediate launches.
- Land, buildings, production, launches and research progress survive local and cloud save transfers.

Start in **Spaceport**, enter a name, choose land on the map and found your company. Build a factory and launch pad first. Keep your starter satellite earning through contracts while construction runs. This is a fictional single-player simulation; plots are not shared or contested by other players.

Run `node tests/spaceport.cjs` for construction, land ownership, power, production, launch and save checks. UI rendering checks use a lightweight DOM stub; full browser layout is not covered.

## New in 2.2

Optional cloud saves are deployed to a dedicated Supabase project. Open Company, create a cloud save and keep your private recovery code. On another device, use Enter recovery code. Save online is manual; device-local autosaving continues as before.

The browser contains only the public application key. Database tables cannot be listed or edited directly by public callers. Recovery codes are 256-bit random secrets; the database stores only their SHA-256 hashes. A code grants read/write access to that save, so keep it private. Conflicting revisions require loading the newer save before another upload.

See `supabase/README.md` for backend deployment and verification.

## New in 2.1

- Satellite specialties: matching assignments earn +20% reward and take 15% less time.
- Relay-1 and Nimbus-1 unlock after 3 completed contracts.
- Quick scans and standard missions, plus long-term contracts after 5 completions.
- Seven objectives with one-time cash and research rewards.
- Export/import JSON saves in Company, with a local pre-import backup and restore.
- Existing saves and active mission quotes remain compatible.

## Play offline

Download and extract the entire repository, then open `index.html` in Chrome. Keep the `js` and `vendor` folders next to it. No installation or account is required.

## Development

- `index.html` and `style.css`: interface and layout.
- `js/`: game rules, saves, world map and controls.
- `js/cloud.js` and `js/cloud-config.js`: cloud save client and public connection settings.
- `js/objectives.js`: progress tracking and one-time milestone rewards.
- `js/locale.js`: English country names and migration of Dutch activity messages.
- `vendor/`: bundled D3 library and its license.
- `tests/regression.cjs`: game logic, map projection and save compatibility checks.

Run checks with Node.js: `node tests/regression.cjs` and `node tests/cloud.cjs`. The cloud client suite uses a mocked HTTP transport.

Progress is stored in the browser. Keep the existing `spaceCorp_save_v2` and `spaceCorp_save` keys compatible so existing players retain their progress. Country IDs and contract type indices must remain stable.

## Publishing

GitHub Pages deploys from `main`, `/(root)`. Changes on that branch are published automatically. The repository name and game URL remain unchanged.

See `LEES-MIJ.txt` for the English player guide and `CREDITS.txt` for sources and licenses.
