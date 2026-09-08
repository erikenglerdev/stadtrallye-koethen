# Docker deployment

The app runs as one Node 24 container with SQLite in a named volume. No separate database service is required. Run a single app replica sharing this volume; do not scale replicas across hosts.

1. Put `compose.yaml` and `.env` in one directory on the server. Use `.env.example` as the template for `.env` and set `APP_ORIGIN` to the public origin (scheme and host, without a path or trailing slash).
2. Set `RALLY_DASHBOARD_PASSWORD` and a random `RALLY_DASHBOARD_SESSION_SECRET` (at least 32 characters; generate with `openssl rand -hex 32`). These values are runtime-only and excluded from the image. Keep `.env` private (`chmod 600 .env`). Missing credentials disable dashboard access.
3. Pull and start with `docker compose up -d`. Compose always checks the registry for the selected image tag; no source checkout, Dockerfile, Node installation or build on the server is required.
4. Check `docker compose ps` and `docker compose logs --tail=100 rally`.

The service binds to `127.0.0.1:3000` on the host, configurable with `RALLY_PORT`. Put the existing HTTPS reverse proxy in front of this port. Real-device GPS and production session cookies require HTTPS. Preserve the public Host header; `APP_ORIGIN` must match the browser's origin. There is no built-in TLS proxy or automatic deployment.

`/` is the game; `/dashboard/` is the password-protected read-only team display. Login sessions last 12 hours. The dashboard updates every five seconds and interpolates running timers between updates; connection errors are shown explicitly. Only code, team name, status, start/finish times and penalties are returned, never GPS data or station positions. Teams marked “Unterwegs” have started but not finished; this is not a device-online indicator. Finished rounds persist, including penalties. Abandoned rounds and incompatible older routes are listed separately.

The published image serves the domain root (`BASE_PATH` is empty at build time). A different subpath requires a custom image built from source; it cannot be changed through the deployment `.env`.

## Image publication and updates

`.github/workflows/docker.yml` runs on every push to `main` and can also be started manually on `main`. It validates the app, then builds Linux AMD64 and ARM64 images and publishes them to `ghcr.io/erikenglerdev/stadtrallye-koethen`. Tags are `latest` and `sha-<full-commit-id>`. Publishing uses the automatic `GITHUB_TOKEN` with `packages: write`; no registry password needs to be added as a repository secret. Repository Actions must be enabled, including on forks.

`RALLY_IMAGE_TAG` defaults to `latest`. To update, run `docker compose up -d` again; to select an earlier release, set `RALLY_IMAGE_TAG=sha-<full-commit-id>` and run the same command. Data stays in the existing volume. The workflow only publishes images; it never deploys onto your server.

The first image must finish publishing before the server can pull it. GitHub initially creates container packages as private, even for a public repository. For deployment without a registry login, open the package settings on GitHub and set its visibility to public after the first publication. If the package remains private, log in on the server once using `docker login ghcr.io` with a token that has `read:packages`; do not put that token in the Compose file. [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

The workflow follows the [official Docker multi-platform Actions setup](https://docs.docker.com/build/ci/github-actions/multi-platform/).

The named `rally-data` volume preserves team identities, confirmations, penalties and finish timestamps across container replacement. Do not use `docker compose down -v` unless intentionally deleting all results. For a consistent backup, stop the app briefly, back up the entire volume (including SQLite sidecar files), then start it again. Restore the backup into the volume while the app is stopped. Existing databases gain team and device-session tables automatically, preserving existing browser sessions; older anonymous rounds are labeled as legacy entries.

Development simulation is deliberately unavailable in this production image. Locally, use `npm run dev -- --hostname 127.0.0.1`, then `/?simulation=1` and `/dashboard/?simulation=1`. Simulation uses its own database and is never mixed into the real dashboard. For local development put the same dashboard variables in ignored `.env.local`.

## License and attribution

Images contain the unchanged upstream `LICENSE`, `NOTICE.md` and public `/legal/` documents. `/lizenzen/` is accessible without login. The project derives from Scavenger Hunt by Vincent CHALAMON and this adaptation remains CC BY-NC-SA 4.0, except separately licensed third-party material. Preserve these notices when redistributing images. See [NOTICE.md](../NOTICE.md) for changes, credits and the scope of the rights review.
