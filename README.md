# Orbit Pact 2.1

Build a satellite company, complete contracts and expand your fleet.

[Play Orbit Pact](https://lukasoudorp-cmd.github.io/spacegame/)

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
- `js/objectives.js`: progress tracking and one-time milestone rewards.
- `js/locale.js`: English country names and migration of Dutch activity messages.
- `vendor/`: bundled D3 library and its license.
- `tests/regression.cjs`: game logic, map projection and save compatibility checks.

Run checks with Node.js: `node tests/regression.cjs`.

Progress is stored in the browser. Keep the existing `spaceCorp_save_v2` and `spaceCorp_save` keys compatible so existing players retain their progress. Country IDs and contract type indices must remain stable.

## Publishing

GitHub Pages deploys from `main`, `/(root)`. Changes on that branch are published automatically. The repository name and game URL remain unchanged.

See `LEES-MIJ.txt` for the English player guide and `CREDITS.txt` for sources and licenses.
