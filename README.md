# Orbit Pact 2.3.1

Build a satellite company, complete contracts and expand your fleet.

[Play Orbit Pact](https://lukasoudorp-cmd.github.io/spacegame/)

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
