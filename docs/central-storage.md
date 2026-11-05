# Central storage

The family's data lives on a server so that all phones and tablets see the same state. The app and
its small PHP API are served from the same web space and deployed by one GitHub Actions workflow.
There are no user accounts: access works through one secret link.

## What is stored

One JSON document called the **state**, saved as a whole in one database row (table `state`). The
API does not look inside it; the app owns the format. Limits: a JSON object, at most 256 KiB.

Each save raises a **version** number. A save must say which version it was based on (`If-Match`).
If someone else saved in between, the server answers `409` with the current state, so the app can
merge and try again. Two writers can never both win: the check runs in a database transaction with a
row lock.

## Endpoints

All responses are JSON with `Cache-Control: no-store`. Authentication is
`Authorization: Bearer <key>`. There are no CORS headers: app and API share one origin, and local
development uses the Vite proxy.

| Request             | Key        | Answer                                                                                                  |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `GET /api/health`   | none       | `{ ok, commit, db }`. `503` if the database is not reachable.                                           |
| `GET /api/state`    | family key | `{ data, version, updated_at }`. Before the first save: `data: null`, `version: 0`, `updated_at: null`. |
| `PUT /api/state`    | family key | Header `If-Match: "<version>"`, body `{ "data": { ... } }`. Answer `{ version, updated_at }`.           |
| `POST /api/migrate` | deploy key | Applies pending `api/migrations/*.sql` in order. Answer `{ applied: [names] }`. Safe to repeat.         |
| `POST /api/mcp`     | MCP key    | Debugging endpoint for agents, see below.                                                               |

Errors: `401` wrong or missing key, `428` missing `If-Match`, `409` version conflict (body has the
current `data`, `version`, `updated_at`), `400` body is not `{ "data": <object> }`, `413` more than
256 KiB, `429` too many wrong keys, `405` wrong method, `404` unknown route. Timestamps are UTC with
milliseconds, for example `2026-11-05T21:40:00.123Z`.

Wrong keys are counted per IP address. After 20 wrong keys within 10 minutes the address gets `429`
for the rest of the window (even with the right key). Requests without any key are not counted.

### MCP endpoint

`POST /api/mcp` with `Authorization: Bearer <MCP_KEY>` is a small stateless JSON-RPC endpoint
(`initialize`, `tools/list`, `tools/call`). It is the only way to look inside the server, because
there is no SSH. Read tools: `status` (PHP version, commit, schema version, database, disk use),
`read_log` (last lines of the API log), `query` (one `SELECT`, at most 200 rows, runs in a read-only
transaction), `get_state`. The write tools `put_state` and `migrate` exist only when the GitHub
repository variable `MCP_ALLOW_WRITE` is `1` at deploy time.

## The family link and the key

The link is `https://brush.ingsparks.de/#key=<FAMILY_KEY>`. One key, read and write; there is no
view-only link. The key stands after `#`, so browsers never send it to the web server in a page
request and it does not end up in server logs or the `Referer` header. Only the app's own API
calls carry it, in the `Authorization` header.

The server stores only the SHA-256 hash of the key (in `config/config.php`, outside the document
root) and compares it with `hash_equals`. The key itself exists only in the GitHub secret and in the
link you hand out.

Do not post the link in public places. Whoever has it can read and change the state.

### Rotate the link

1. Create a new key: `openssl rand -hex 32`.
2. In GitHub, repository settings, Environments, `production`: replace the secret `FAMILY_KEY`.
3. Run the workflow: Actions, Deploy, Run workflow.
4. When it is green, the old link is dead. Send `https://brush.ingsparks.de/#key=<new key>` to the
   family. The stored data stays; only access changes.

`DEPLOY_KEY` and `MCP_KEY` rotate the same way.

## One-time steps for the owner in all-inkl KAS

These cannot be done from the repository.

1. **Folder and subdomain.** Create the subdomain `brush.ingsparks.de` with target directory
   `brush/public/`. Choose PHP 8.4 for it. Enable Let's Encrypt for the subdomain.
2. **Database.** Create a MariaDB database and user (Tools, Databases). Note host, database name,
   user and password. phpMyAdmin is available there if you ever need to look at the data.
3. **FTP user.** Create an FTP user whose root is the folder `brush/`. The deploy then cannot touch
   anything else in the account. FTP uses explicit FTPS on port 21 (no SFTP at all-inkl).
4. **GitHub environment.** In the repository create the environment `production` and add the
   secrets below.

Result on the server (all created by the deploy):

```
brush/                      FTP root of the deploy user
  config/config.php         DB credentials, key hashes, commit (not public)
  api/src/, api/migrations/ PHP code and SQL files (not public)
  logs/api.log              request log, written by the API (not public)
  public/                   document root of brush.ingsparks.de
    .htaccess, index.html, assets/, api/index.php
```

### GitHub secrets (environment `production`)

| Secret                                         | What it is                                                      |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`   | FTPS access of the FTP user from step 3                         |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Database from step 2                                            |
| `FAMILY_KEY`                                   | The key behind the family link. Random, at least 32 characters. |
| `DEPLOY_KEY`                                   | Protects `POST /api/migrate`. Random, at least 32 characters.   |
| `MCP_KEY`                                      | Protects `POST /api/mcp`. Random, at least 32 characters.       |

Generate each key with `openssl rand -hex 32`. Optional repository variable `MCP_ALLOW_WRITE=1`
turns the MCP write tools on.

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main` and on "Run workflow":

1. `bun run check-ci`, `php -l` on all PHP files, the API tests against PHP and MariaDB in Docker.
2. `bun run build`.
3. Assemble the upload folder: build into `public/`, `deploy/.htaccess`, `api/index.php`, PHP code
   and migrations next to `public/`, and `config/config.php` generated from the secrets by
   `deploy/make-config.php` (key hashes only).
4. Upload by FTPS in two passes (incremental, never "clean slate"): first everything except
   `index.html`, then `index.html`, so visitors switch to the new build only after its files are in
   place.
5. `POST /api/migrate`.
6. `deploy/check.sh`: health shows the new commit, `/` is revalidated, assets are cached for a year,
   a missing asset is 404, an unknown path returns the app, `/api/state` without key is 401, the
   family key works, dotfiles are not served, http redirects to https. The result is on the run page.

If an upload was interrupted, the health check shows the old commit; run the workflow again.

## Run the API locally

Needs Docker. No PHP on the host.

```sh
bun run api-up      # PHP 8.4 + Apache and MariaDB 10.11 on http://localhost:8088
bun run api-test    # tests against that stack
bun run api-down    # stop (data stays in Docker volumes; add -v to the compose command to wipe)
```

`bun run dev` proxies `/api` to port 8088. The stack uses throwaway keys from
`api/tests/config.php`: family key `dev-family-key`, deploy key `dev-deploy-key`, MCP key
`dev-mcp-key`. Migrations run when the container starts. The server code is mounted from `api/`,
so PHP changes apply on the next request. `deploy/check.sh http://localhost:8088 dev` runs the
deploy checks against it.

The tests reset the state and the throttle counters themselves (through `docker compose exec`), so
they can run repeatedly. They leave the stored state in whatever shape the last test wrote.

## Database changes

Add a new file `api/migrations/NNNN_name.sql` (next number, plain SQL, statements end with `;` at the
end of a line, `--` comment lines are allowed). The deploy applies it once and records it in
`schema_migrations`. Do not edit migrations that have been deployed.
