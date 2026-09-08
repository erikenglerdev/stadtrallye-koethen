# Docker deployment

The app runs as one Node 24 container with SQLite in a named volume. No separate database service is required. Run a single app replica sharing this volume; do not scale replicas across hosts.

1. Copy `.env.example` to `.env` and set `APP_ORIGIN` to the public origin (scheme and host, without a path or trailing slash).
2. Set `RALLY_DASHBOARD_PASSWORD` and a random `RALLY_DASHBOARD_SESSION_SECRET` (at least 32 characters; generate with `openssl rand -hex 32`). These values are runtime-only and excluded from the image. Keep `.env` private (`chmod 600 .env`). Missing credentials disable dashboard access.
3. Build with `docker compose build` and start with `docker compose up -d`.
4. Check `docker compose ps` and `docker compose logs --tail=100 rally`.

The service binds to `127.0.0.1:3000` on the host, configurable with `RALLY_PORT`. Put the existing HTTPS reverse proxy in front of this port. Real-device GPS and production session cookies require HTTPS. Preserve the public Host header; `APP_ORIGIN` must match the browser's origin. There is no built-in TLS proxy or automatic deployment.

`/` is the game; `/dashboard/` is the password-protected read-only team display. Login sessions last 12 hours. The dashboard updates every five seconds and interpolates running timers between updates; connection errors are shown explicitly. Only code, team name, status, start/finish times and penalties are returned, never GPS data or station positions. Teams marked “Unterwegs” have started but not finished; this is not a device-online indicator. Finished rounds persist, including penalties. Abandoned rounds and incompatible older routes are listed separately.

For a subpath, set `BASE_PATH` before building (for example `/rally`). Rebuild when changing it. The dashboard then lives at `/rally/dashboard/`. The origin still has no path.

The named `rally-data` volume preserves team identities, confirmations, penalties and finish timestamps across container replacement. Do not use `docker compose down -v` unless intentionally deleting all results. For a consistent backup, stop the app briefly, back up the entire volume (including SQLite sidecar files), then start it again. Restore the backup into the volume while the app is stopped. Existing databases gain team and device-session tables automatically, preserving existing browser sessions; older anonymous rounds are labeled as legacy entries.

Development simulation is deliberately unavailable in this production image. Locally, use `npm run dev -- --hostname 127.0.0.1`, then `/?simulation=1` and `/dashboard/?simulation=1`. Simulation uses its own database and is never mixed into the real dashboard. For local development put the same dashboard variables in ignored `.env.local`.
