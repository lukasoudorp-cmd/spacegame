# Orbit Pact cloud backend

Project: [orbit-pact](https://supabase.com/dashboard/project/owrbkieinndwqpkbulcx), in Frankfurt. The browser game continues to be hosted on GitHub Pages.

## Deployed resources

- `public.orbit_pact_saves`: one JSON save and monotonically increasing revision per recovery-code hash.
- `orbit_pact_load_save(p_code text)`: returns only the matching save, or null.
- `orbit_pact_store_save(p_code text, p_state jsonb, p_revision bigint)`: creates or updates that save after checking data, revision and write interval.

The migration is in `migrations/20260911_cloud_saves.sql`. Apply it through Supabase migrations or the SQL editor. This project was provisioned and the migration applied through Composio. No existing project was deleted.

## Access model

The client creates a 256-bit recovery code with `crypto.getRandomValues`. Possession of this code authorizes access to one cloud slot. It is not an email account. The public Supabase key does not authorize access to saved games by itself.

Only SHA-256 hashes of recovery codes are stored in the table. Codes are sent in HTTPS POST bodies, never URL query parameters. The browser retains its code separately from the game state. Never log codes or include them in analytics, public issues, game exports or screenshots.

Row-level security is enabled, with all direct table access revoked from public, anonymous and authenticated client roles. Only the two SQL functions are executable by those roles. Both use a fixed empty search path, verify the supplied code and return no other players' records. They do not accept a row ID or a caller-supplied owner ID. The application ships a publishable key; database passwords and service-role keys must never be included in the frontend.

Save payloads are limited to 2 MB and validated. Existing slots accept at most one changed upload per 5 seconds. Expected revisions prevent a stale device from silently overwriting a newer save. Identical retries do not increase the revision. This is cloud backup for a local simulation, not a trusted multiplayer economy or anti-cheat service.

Recovery codes act like passwords. Lost codes cannot be recovered without the original browser's saved connection. Players should retain an exported JSON backup too. For a large public launch, add service-wide abuse controls and monitoring before increasing project quotas.

## Validation

- `node tests/regression.cjs`: game rules, save compatibility and local backup/restore.
- `node tests/cloud.cjs`: client transfer, storage failures, corrupted replies and revision conflicts, with mocked HTTP calls.
- `supabase/tests/cloud_saves.sql`: database assertions using the anonymous role, including access isolation and stale-write rejection. Fixtures are rolled back inside the test block.

The live migration and SQL assertions were executed through Composio. A full browser-to-Supabase HTTP test could not be run from the restricted workspace network. No browser layout test was performed.
