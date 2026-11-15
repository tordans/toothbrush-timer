# Central storage

Families keep their data on a server so that all of their phones and tablets see the same state.
The app and its small PHP API are served from the same web space and deployed by one GitHub
Actions workflow. There are no user accounts: a family is one secret link, and a new family can
only be created by someone who knows the invite word.

## What is stored

One row per family in the table `families`:

| Column       | What it is                                                                       |
| ------------ | -------------------------------------------------------------------------------- |
| `id`         | Number, only used inside the database.                                           |
| `key_sha256` | SHA-256 of the family key (unique). The key itself is never stored.              |
| `data`       | The family's **state**, one JSON document, saved as a whole. `NULL` until saved. |
| `version`    | Counts saves, 0 before the first one.                                            |
| `created_at` | When the family was created (UTC).                                               |
| `updated_at` | Time of the last save (UTC), `NULL` before the first one.                        |

The API does not look inside the state; the app owns the format. Limits: a JSON object, at most
256 KiB.

Each save raises the **version**. A save must say which version it was based on (`If-Match`). If
another device saved in between, the server answers `409` with the current state, so the app can
merge and try again. Two writers can never both win: the check runs in a database transaction with
a row lock.

The table `photos` holds the metadata of the reward photos (see "Reward photos"). The table
`invite_attempts` holds failed invite attempts for one hour: a hash of the IP address
(with a salt that changes every day, so the address itself is never stored) and a time.

## Endpoints

All responses are JSON with `Cache-Control: no-store`. Authentication is
`Authorization: Bearer <family key>`. There are no CORS headers: app and API share one origin, and
local development uses the Vite proxy.

| Request                | Needs               | Answer                                                                                        |
| ---------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| `GET /api/health`      | nothing             | `{ ok, commit }`. Does not use the database.                                                  |
| `POST /api/families`   | invite word in body | Body `{ "invite": "<word>" }`. `201 { key }`: the new family key, shown only this once.       |
| `GET /api/state`       | family key          | `{ data, version, updated_at }`. New family: `data: null`, `version: 0`, `updated_at: null`.  |
| `PUT /api/state`       | family key          | Header `If-Match: "<version>"`, body `{ "data": { ... } }`. Answer `{ version, updated_at }`. |
| `POST /api/family/key` | family key          | `200 { key }`: a new key. The old key stops working at once.                                  |

Errors for `/api/state` and `/api/family/key`: `401` wrong or missing key, `428` missing
`If-Match`, `409` version conflict (the body has the current `data`, `version`, `updated_at`),
`400` body is not `{ "data": <object> }`, `413` more than 256 KiB, `429` too many wrong keys.
Everywhere: `405` wrong method (with an `Allow` header), `404` unknown route, `500` server error
(`{ "error": "internal" }`, details in the log). Timestamps are UTC with milliseconds, for example
`2026-11-05T21:40:00.123Z`.

Photos have their own endpoints, described in "Reward photos" below.

Errors for `POST /api/families`: `403 invalid_invite` (wrong word), `400` body is not a JSON
object, `413` body larger than 4 KiB, `429 too_many_attempts` (10 wrong words from one IP address
within an hour; even the right word is refused until the hour is over), `429 too_many_new_families`
(5 families were created in the last 24 hours, by anyone), `503 families_full` (100 families exist).
Delete a family (below) to make room.

Wrong family keys are counted per IP address, separately from wrong invite words. After 20 wrong
keys within 10 minutes the address gets `429` for the rest of the window (even with a right key).
Requests without any key are not counted.

The API creates and updates its database tables itself, before the first request that needs the
database (see "Database changes"). `GET /api/health` never touches the database, so it also answers
while the database is down.

## Reward photos

Parents upload photos (the app has already resized them to at most 2048 pixels on the long side, as
JPEG or WebP) and the children's app shows them later. A photo can only be read with the family key,
never from a public URL.

One row per photo in the table `photos`:

| Column       | What it is                                                                           |
| ------------ | ------------------------------------------------------------------------------------ |
| `id`         | 22 characters of base64url (16 random bytes). Also the file name.                    |
| `family_id`  | The family it belongs to. Indexed; deleting the family deletes the rows (`CASCADE`). |
| `type`       | `image/jpeg` or `image/webp`.                                                        |
| `width`      | Pixels, 1 to 4096.                                                                   |
| `height`     | Pixels, 1 to 4096.                                                                   |
| `bytes`      | Size of the file.                                                                    |
| `created_at` | When it was uploaded (UTC, milliseconds).                                            |

The files are not in the database. They live **outside the document root**, next to `config/` and
`logs/`:

```
<root>/data/.htaccess                      Require all denied (written when data/ is first created)
<root>/data/photos/<family_id>/<id>.jpg    or .webp
```

The folders are created on demand. A file is written to a temporary name in its folder and then
renamed, so a half-written photo never exists under its real name. The row is inserted only after the
file is in place; if the insert fails, the file is removed again. Delete removes the row first, then
the file. A photo never changes, so there is no update.

A renewed family key keeps the photos: the family id stays the same.

All requests need `Authorization: Bearer <family key>`, and throttling, `401` and `429` work exactly
as for `/api/state`.

| Request                   | Answer                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /api/photos`         | `200 { "photos": [ { id, width, height, bytes, type, created_at } ] }`, oldest first. `no-store`.   |
| `POST /api/photos`        | Body: the raw image bytes, `Content-Type: image/jpeg` or `image/webp`. `201` with the photo object. |
| `GET /api/photos/{id}`    | `200` with the image bytes (see below).                                                             |
| `DELETE /api/photos/{id}` | `204` without a body.                                                                               |

`GET /api/photos/{id}` answers with the stored `Content-Type` and `Content-Length`, `Cache-Control:
private, max-age=31536000, immutable` (a photo never changes), `X-Content-Type-Options: nosniff` and
`Content-Disposition: inline`. The browser can therefore keep a photo for good, but a shared cache
may not.

Errors: `401` wrong or missing key, `429` too many wrong keys, `405` wrong method (with `Allow`),
`404 not_found` for an id that is unknown, malformed (not 22 base64url characters) or belongs to
another family (the answer never shows that another family's id exists), `415 unsupported_type`
(wrong `Content-Type`, or the bytes are not really that image, or a side is not 1 to 4096 pixels),
`413 too_large` (more than 3 MiB), `409 too_many_photos` (the family already has 300).

How an upload is checked: the `Content-Type` must be `image/jpeg` or `image/webp`; the body is at
most 3 MiB; the first bytes must be the magic bytes of that type; `getimagesizefromstring` must
read it and report the same type; width and height must be 1 to 4096. The limit of 300 photos is
checked in a transaction with a lock on the family row. The limits of the other routes (4 KiB for
`POST /api/families`, 256 KiB for the state) are not changed; a photo body is read raw from
`php://input`, so `post_max_size` and `upload_max_filesize` do not apply, only `memory_limit` (the
body is held in memory: 3 MiB against 128 MiB by default).

The server owner can see the photos in the FTP folder `data/photos/`. From the web they cannot be
read without the family key: `data/` is outside the document root and also has its own
`.htaccess`. The deploy never creates, overwrites or deletes `data/` (the FTP sync only deletes
files it uploaded itself).

## Invite word, family link and key

The **invite word** is chosen by the owner and only given to people who may start a family. The
server stores only its SHA-256 (in `config/config.php`, outside the document root) and compares it
with `hash_equals`. Hand it out in person, not in public places.

Someone who enters the invite word in the app gets a new **family key**: 32 random bytes, written
as 43 URL-safe characters, made by the server. The family link is
`https://brush.ingsparks.de/#key=<key>`. The key stands after `#`, so browsers never send it to the
web server in a page request and it does not end up in server logs or the `Referer` header. Only
the app's own API calls carry it, in the `Authorization` header. The server stores only the SHA-256
of the key, so even the owner of the server cannot read a key back. A lost key cannot be recovered.

Do not post a family link in public places. Whoever has it can read and change that family's
state, and only that family's.

### Renew a family link

If a link leaks, the family renews it in the app. The app calls `POST /api/family/key` with the
current key and shows the new link. The old link stops working at once; the stored data stays.
Devices that still use the old link get `401` and have to be opened with the new link.

### Delete a family by hand

There is no delete endpoint. In phpMyAdmin (KAS, Tools, Databases), open the database and the
table `families`. Find the family by `created_at`, `updated_at` and the size of its data, then
delete the row (or run `DELETE FROM families WHERE id = <id>;`). Its key is invalid from then on and
the place is free again for the limit of 100 families. The rows of its photos go with it, but the
photo files do not: also delete the folder `data/photos/<id>/` by FTP (`<id>` is the number in the
column `id`). The data cannot be restored; make an export of the row first if in doubt. The same
table shows how many families exist.

### Change the invite word

Pick a new word and run `scripts/setup-deploy-secrets.sh` again (or only
`gh secret set INVITE_SHA256 --env production` with the new hash), then run the workflow
("Run workflow"). Families that exist are not affected.

## One-time steps for the owner in all-inkl KAS

These cannot be done from the repository. Do them in this order.

1. **Subdomain.** KAS, Domain, Subdomain: add `brush` under `ingsparks.de`. KAS creates the folder
   `brush.ingsparks.de/`. Change the target of the subdomain to its subfolder
   **`brush.ingsparks.de/public/`**, so that `config/`, `api/` and `logs/` next to it are not
   reachable from the web. Create `public/` first (via FTP or the KAS file manager) if KAS insists
   on an existing folder.
2. **PHP.** For the subdomain choose PHP 8.5 (as on the server). Needed extensions: `pdo_mysql`, `mbstring`,
   `openssl`.
3. **TLS.** Enable Let's Encrypt for `brush.ingsparks.de` and wait until
   `https://brush.ingsparks.de/` answers (an error page is fine before the first deploy). The
   `.htaccess` redirects http to https and sends HSTS, so TLS must work before the first deploy.
4. **Database.** KAS, Tools, Databases: create a MariaDB database and user. Note host (usually
   `localhost`), database name, user and password. The tables are created by the API itself on the
   first request that needs them.
5. **FTP user.** KAS, Tools, FTP: create an FTP user limited to the folder `brush.ingsparks.de/`.
   The deploy then cannot touch anything else in the account. The workflow uses explicit FTPS on
   port 21 (all-inkl has no SFTP). Use a long random password just for this user.
6. **GitHub secrets.** Run `scripts/setup-deploy-secrets.sh` on your machine (needs the `gh` CLI
   logged in to the repository). It asks for the FTP and database values (passwords are hidden) and
   for the invite word (hidden; empty makes one up like `abcd-efgh-jkmn`), and writes the secrets
   to the GitHub environment `production` with `gh secret set`. The invite word is stored as its
   SHA-256 only. Nothing is written to disk.
7. **Switch the deploy on.** This is the last step. Until it is done, a push to `main` runs
   nothing. Set the repository variable (Settings, Secrets and variables, Actions, Variables), or:

   ```sh
   gh variable set DEPLOY_ENABLED --body true
   ```

   The next push to `main`, or Actions, Deploy, "Run workflow", deploys. To stop deploying, delete
   the variable or set it to anything but `true`.

### GitHub secrets (environment `production`)

The script sets exactly these eight:

| Secret                                         | What it is                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`   | FTPS access of the FTP user from step 5                             |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Database from step 4                                                |
| `INVITE_SHA256`                                | SHA-256 (64 hex characters) of the invite word, not the word itself |

By hand, the digest is `printf '%s' '<invite word>' | shasum -a 256 | cut -d' ' -f1` (no trailing
newline). The word is compared exactly as sent, so case matters.

The salt for the IP hashes of failed invite attempts is derived from `DB_PASSWORD` when the config
is generated, so it needs no secret of its own.

### Result on the server

```
brush.ingsparks.de/               FTP root of the deploy user
  config/config.php               DB credentials, invite word digest, commit (not public)
  api/src/, api/migrations/       PHP code and SQL files (not public)
  logs/api.log                    server errors only (no request content, no IP); not public
  data/photos/<family id>/        reward photos, created by the API; not public, not touched by the deploy
  public/                         document root of https://brush.ingsparks.de
    .htaccess, index.html, assets/, api/index.php
```

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main` and on "Run workflow", but only when the
repository variable `DEPLOY_ENABLED` is `true`. It does not run any tests: they run on your machine
in the Husky pre-push hook. One deploy runs at a time and a running deploy is never cancelled.

1. `bun run build`.
2. Assemble `deploy-out/`: the build into `public/`, `deploy/.htaccess`, `api/index.php` as
   `public/api/index.php`, the PHP code and migrations next to `public/`, and `config/config.php`
   generated from the secrets by `deploy/make-config.php` (it fails if a secret is missing or
   `INVITE_SHA256` is not 64 hex characters).
3. Upload by FTPS in two passes (incremental, never a clean slate): first everything except
   `index.html`, then `index.html`, so visitors switch to the new build only after its files and
   the new API code are in place.
4. `deploy/check.sh https://brush.ingsparks.de <commit>`: `/api/health` shows the new commit; a wrong
   invite word on `POST /api/families` is `403` (this uses the database, so a broken migration
   fails here; it counts as one failed attempt for the runner's IP address and expires after an
   hour); `/` is HTML and revalidated; an asset is cached for a year; a missing asset is `404`; an
   unknown path returns the app; `/api/state` without a key and with a wrong key and
   `/api/family/key` without a key are `401`; dotfiles are not served; the security headers arrive;
   http redirects to https. Nothing is created on the site. The result is on the run page.

If an upload was interrupted, the health check shows the old commit; run the workflow again.

## Run the API locally

Needs Docker. No PHP on the host.

```sh
bun run api-up      # (re)builds the image; PHP 8.5 + Apache and MariaDB 10.11 on http://localhost:8088
bun run api-test    # tests against that stack
bun run api-down    # stop (data stays in Docker volumes; add -v to the compose command to wipe)
```

`bun run dev` proxies `/api` to port 8088. The stack uses the throwaway invite word `dev-invite`
from `api/tests/config.php`; create a family with it, for example:

```sh
curl -s -X POST localhost:8088/api/families -H 'Content-Type: application/json' -d '{"invite":"dev-invite"}'
```

The server code is mounted from `api/`, so PHP changes apply on the next request. The tables are
created by the first request that needs the database. `deploy/check.sh http://localhost:8088 dev`
runs the deploy checks against the stack.

If port 8088 is taken, start the stack and run the tests with `BRUSH_API_PORT=8089` set (the same
value for both).

The tests empty the tables and the throttle counters themselves (through `docker compose exec`), so
they can run repeatedly. One test stops the database container for a moment and starts it again.

## Database changes

Add a new file `api/migrations/NNNN_name.sql` (next number, plain SQL, statements end with `;` at the
end of a line, `--` comment lines are allowed). Write it so that running it twice does no harm
(`CREATE TABLE IF NOT EXISTS`, and so on), because MariaDB does not roll back table changes. The API
applies it once, before the first request that needs the database after the deploy, and records it in
`schema_migrations`; requests that arrive at the same moment wait for each other. Do not edit
migrations that have been deployed.
