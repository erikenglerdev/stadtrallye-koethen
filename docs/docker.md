# Docker deployment

The app runs as one Node 24 container with SQLite in a named volume. The image does not contain or start Nginx. No separate database service is required. Run a single app replica sharing this volume; do not scale replicas across hosts.

1. Put `compose.yaml` and `.env` in one directory on the server. Use `.env.example` as the template for `.env` and set `APP_ORIGIN` to the public origin (scheme and host, without a path or trailing slash).
2. Set `RALLY_DASHBOARD_PASSWORD` and a random `RALLY_DASHBOARD_SESSION_SECRET` (at least 32 characters; generate with `openssl rand -hex 32`). These values are runtime-only and excluded from the image. Keep `.env` private (`chmod 600 .env`). Missing credentials disable dashboard access.
3. Pull and start with `docker compose up -d`. Compose always checks the registry for the selected image tag; no source checkout, Dockerfile, Node installation or build on the server is required.
4. Check `docker compose ps` and the container health status with `docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q rally)"`.

The service binds to `127.0.0.1:3000` on the host, configurable with `RALLY_PORT`. Put the existing HTTPS reverse proxy in front of this port. Real-device GPS and production session cookies require HTTPS. Preserve the public Host header; `APP_ORIGIN` must match the browser's origin. There is no built-in TLS proxy or automatic deployment. According to the operator, this deployment uses only host Nginx; there is no Nginx service in the app image or Compose profile. The Compose service uses Docker's `none` logging driver, so `docker compose logs` cannot show its output. The host Nginx configuration is outside this repository.

### Logging for the rally domain

The app container does not write application log files. The image sends the Node server's stdout and stderr to `/dev/null`, and Compose additionally uses Docker's `none` logging driver. An already running container retains its original logging driver until it is recreated. After deploying this Compose file and the updated image, recreate only the rally service, then verify the effective driver:

```sh
docker compose up -d --no-deps --force-recreate rally
docker inspect --format '{{.HostConfig.LogConfig.Type}}' "$(docker compose ps -q rally)"
```

The inspect command must print `none`. The named `rally-data` volume remains attached when the service is recreated. The operator reports that host Nginx logging is disabled. To verify this for the rally domain, inspect the effective configuration of its HTTP and HTTPS `server` blocks, including inherited settings and nested `location` blocks. If site-level overrides are needed, use:

```nginx
access_log off;
error_log /dev/null emerg;
```

Nested `location` blocks can reinstate logging with their own `access_log` or `error_log` directives. The host configuration is outside this repository, so its effective state and any inherited or pre-vhost logging must be checked on the server. Existing logs and backups require a separate deletion decision; disabling new entries does not erase them.

`/` is the game; `/dashboard/` is the password-protected team display with help-chat replies. Login sessions last 12 hours. The dashboard updates every five seconds and interpolates running timers between updates; connection errors are shown explicitly. Team identity, status, start/finish times, penalties and help messages are available to authorized dashboard users, never GPS samples or station positions. Teams marked “Unterwegs” have started but not finished; this is not a device-online indicator. Finished rounds persist, including penalties. Abandoned rounds and incompatible older routes are listed separately.

The published image serves the domain root (`BASE_PATH` is empty at build time). A different subpath requires a custom image built from source; it cannot be changed through the deployment `.env`.

## Image publication and updates

`.github/workflows/docker.yml` runs on every push to `main` and can also be started manually on `main`. It validates the app, then builds Linux AMD64 and ARM64 images and publishes them to `ghcr.io/erikenglerdev/stadtrallye-koethen`. Tags are `latest` and `sha-<full-commit-id>`. Publishing uses the automatic `GITHUB_TOKEN` with `packages: write`; no registry password needs to be added as a repository secret. Repository Actions must be enabled, including on forks.

`RALLY_IMAGE_TAG` defaults to `latest`. To update, run `docker compose up -d` again; to select an earlier release, set `RALLY_IMAGE_TAG=sha-<full-commit-id>` and run the same command. Data stays in the existing volume. The workflow only publishes images; it never deploys onto your server.

The first image must finish publishing before the server can pull it. GitHub initially creates container packages as private, even for a public repository. For deployment without a registry login, open the package settings on GitHub and set its visibility to public after the first publication. If the package remains private, log in on the server once using `docker login ghcr.io` with a token that has `read:packages`; do not put that token in the Compose file. [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

The workflow follows the [official Docker multi-platform Actions setup](https://docs.docker.com/build/ci/github-actions/multi-platform/).

The named `rally-data` volume preserves team identities, confirmations, penalties, help messages and finish timestamps across container replacement. Do not use `docker compose down -v` unless intentionally deleting all results. For a consistent backup, stop the app briefly, back up the entire volume (including SQLite sidecar files), then start it again. Restore the backup into the volume while the app is stopped. Existing databases gain team, device-session and chat tables automatically, preserving existing browser sessions; older anonymous rounds are labeled as legacy entries.

Development simulation is deliberately unavailable in this production image. Locally, use `npm run dev -- --hostname 127.0.0.1`, then `/?simulation=1` and `/dashboard/?simulation=1`. Simulation uses its own database and is never mixed into the real dashboard. For local development put the same dashboard variables in ignored `.env.local`.

## License and attribution

Images contain the unchanged upstream `LICENSE`, `NOTICE.md` and public `/legal/` documents. `/lizenzen/` is accessible without login. The project derives from Scavenger Hunt by Vincent CHALAMON and this adaptation remains CC BY-NC-SA 4.0, except separately licensed third-party material. Preserve these notices when redistributing images. See [NOTICE.md](../NOTICE.md) for changes, credits and the scope of the rights review.
