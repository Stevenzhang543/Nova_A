# Secure deployment notes

The Node process now owns both the protected pages and the API. The public web server must proxy **every path** to `127.0.0.1:3000`; it must not serve this directory directly. Otherwise `output.json` and the protected HTML files can bypass Node's access checks.

## Before restart

1. Rotate the old MySQL password that appeared in `server.js`. Put the new value in PM2's environment as `DB_PASSWORD`.
2. Generate a long random `SESSION_SECRET` (at least 48 random bytes) and keep it only in PM2's environment.
3. Run `npm install`, then restart through PM2 with the environment updated.
4. Use HTTPS at the reverse proxy. In production, authentication cookies are marked `Secure` and HSTS is enabled.
5. Give the database account access only to the `german_vocab` database and this application's required tables.

The server creates the new scheduling, attempt, and idempotency tables at startup and imports existing `vocabulary_progress` records without deleting them.

## Reverse-proxy shape

The HTTPS virtual host should forward `/`, HTML pages, assets, and `/api/*` to the Node process. Remove any `root /var/www/html` or `location` rule that serves these project files as static files. Forward the original host and protocol headers, and set `TRUST_PROXY=1` only when exactly one trusted reverse proxy sits in front of Node.

## First administrator

Existing admin accounts continue to work. On a fresh database, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` for one startup. The server creates the first administrator only when none exists; remove those two environment values afterward.
