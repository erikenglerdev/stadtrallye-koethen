# Köthener Stadtrallye

A German, mobile-friendly GPS rally with 25 stations, selectable starting station,
a mandatory circular sequence, and server-authoritative timing.

## Run locally

Requires **Node.js 24+** and npm. SQLite is provided by Node itself; no new production dependency is needed.

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:3000/. `/rallye/` opens the same game.
The former clue-based hunts remain available at `/beispiele/` and their existing URLs.

## Local simulation

Start `npm run dev` and open http://127.0.0.1:3000/?simulation=1 (or click
“Testmodus aktivieren” on the normal start screen). Enter any start number.
Click “Startstation simulieren”, then “Nächste Station simulieren” for each stop,
and finally “Rückkehr zum Start simulieren”. Each check takes about five seconds.
No browser location permission is requested. The simulator supplies accurate fixes
at the expected station; the ordinary challenge, GPS validation, sequence and timer
remain in use. Reload resumes the test round. “Neue Runde beginnen” resets only the
selected mode's cookie. Switching back to real GPS preserves the real round.

Simulation is server-gated to development on loopback hosts; production and remote
forwarded clients receive 404. Test sessions use a separate HTTP-only cookie and
`.data/rally-simulation.sqlite`, never the real run database. `npm run build` /
`npm start` does not enable the simulator, even with `?simulation=1`.

## Game rules

1. Enter an assigned team code, a team name and any start station number (1–25).
2. At that station, press “Wir sind da”. Only a successful GPS check starts the timer.
3. Read the hint, walk to the next station, and confirm again.
4. Visit every station in order, wrapping from 25 to 1.
5. Return to the original start station and confirm once more to finish.

The server records 26 confirmations: the starting station, 24 other stations,
and the return to start. Pausing the browser does not pause elapsed time.
Reload restores the same run using an HTTP-only session cookie. One browser profile
represents one group. Clearing cookies or explicitly starting again creates a separate run.
No participant identity or competition registration is implemented.

## GPS checks

- Per-station radius: initially 30 m, configurable in `data/rally-route.json`.
- Maximum reported accuracy radius: 25 m.
- Client gathers at least three fresh fixes across at least five seconds.
- Server independently validates coordinates, timestamps, accuracy, expected station,
  and sample span. Each check uses a short-lived, single-use server challenge.
- Each fix must also be outside the preceding station’s radius plus 5 m. This prevents
  confirming two nearby stations while standing in overlapping acceptance areas.
- Invalid/denied/unavailable GPS, timeout, and network errors do not advance the run.
- Raw GPS coordinates are processed for confirmation and are not persisted.
- The map has no destination markers or place search that would reveal future stops.

**GPS is not a proof of physical presence or walking.** A modified client can submit
fabricated coordinates. Server timing prevents changing a result merely by editing
localStorage or the device clock, but does not prevent GPS spoofing, driving,
sharing a session, or starting a new session. Supervised rotating station codes or
staff confirmation would be needed for stronger attendance evidence.

## Route and placeholder hints

See [the numbered route](docs/rally-route.md).
Edit `hint` on a station to change the hint **leading to that station**.
All hints currently contain an explicitly fictional text and the destination name
for testing. Replace these before an actual mystery game.

Keep `id` stable. After reordering, renumber `number` sequentially.
Any route/hint change changes the route version; existing sessions must start a new
round, preventing accidental reuse of progress for a changed itinerary.
Coordinates are from the supplied Maps list, not surveyed meeting points.
Before the event, verify pedestrian access, exact outdoor meeting points, and GPS
reception at every station. Do not route groups into buildings or operational areas.

## Server operation

This app now requires a **Node server**. Static export / GitHub Pages cannot run the
GPS confirmation API. The former Pages workflow now validates a server build only.
Nothing has been deployed by this change.

```sh
npm run build
npm start -- --hostname 127.0.0.1
```

Run one persistent Node instance behind an HTTPS reverse proxy. Set:

```dotenv
APP_ORIGIN=https://your-rally.example
RALLY_DATA_DIR=/var/lib/koethen-rally
```

`APP_ORIGIN` must exactly match the browser origin, without a trailing slash. Configure
the proxy to forward the original host. Persist the data directory across releases.
The default database is `.data/rally.sqlite`, with SQLite WAL sidecar files. Use a
SQLite-aware backup or stop the server when copying its database files. Restrict the
directory to the server account. It must not be served as public web content.

HTTPS is required for GPS on real phones; plain `http://192.168.x.x` is insufficient.
Loopback HTTP is supported for local development. Production cookies require HTTPS.
No mobile-network deployment or real-world GPS walk has been performed here.

The database stores a hash of the session token, route version, start index,
start/end times, challenge state, and station confirmation timestamps. It stores no
continuous tracking. Operators must set an appropriate event-data retention policy.
A lost cookie cannot be recovered through this app. Server storage and network
availability are required for confirmations. Use proxy rate/body limits before a
public event; no distributed rate limiter or multi-instance deployment is included.

## Verification

```sh
npm run test:rally
npm run validate:config
npx tsc --noEmit
npm run lint:rally
npm run build
```

The rally tests cover all starting stations, full circular completion, GPS rejection,
replay rejection, API/session validation, and SQLite recovery across restart. They
use isolated test databases and synthetic coordinates, not real participant locations.
Legacy browser tests use the examples page and a running Next server.

The original project and its assets retain their [CC BY-NC-SA 4.0 license](LICENSE).
See [legacy documentation](docs/legacy-examples.md) for the original clue mechanisms.

The active counterclockwise route has 25 unique stations plus the return to the start. Stiftstraße (original station 15) was removed at the organizer’s request; the following stations were renumbered. Original GPX and notes are preserved in `data/routes/`. The simulator map displays the supplied walking track, including the western Ritterstraße waypoint. See [route details](docs/rally-route.md) for coordinates and the narrower GPS radii at nearby stations.

During a running round, players can reveal the next station name and map position after confirming a 60-second penalty. The server records each reveal once per step in SQLite and includes cumulative penalties in elapsed/final time. Reopening a revealed target is free; GPS confirmation remains mandatory. Start and return do not offer paid help because the start is already known. The local simulator uses the same help flow in its separate database. Placeholder clues no longer include explicit destination names.

## Live dashboard and Docker

Open `/dashboard/` for the password-protected read-only team display. Running times update every five seconds; finished results remain stored on the server with penalties. `/dashboard/?simulation=1` shows only local development simulations. Configure `RALLY_DASHBOARD_PASSWORD` and `RALLY_DASHBOARD_SESSION_SECRET` at runtime; neither belongs in source control. See [Docker deployment](docs/docker.md) for automatic GHCR image builds, the image-based Compose service, persistent volume and reverse-proxy setup. Server deployment needs only `compose.yaml` and `.env`; `RALLY_IMAGE_TAG` defaults to `latest`.

The 100 allowed participant identifiers are defined in `data/team-codes.json` and listed in [team codes](docs/team-codes.md). Codes are validated server-side and are independent of the freely chosen start station. A code becomes permanently consumed when its start station is confirmed, including after finish or route changes. The start page offers joining an existing unfinished round using only its team code. Each device gets an independent revocable session, sharing progress, penalties and time; updates poll every three seconds. GPS challenges are device-specific and bound to the current step, so concurrent confirmations cannot skip a station. Logging out removes only that device; a started round continues and can be rejoined. Only unstarted reservations with no remaining devices may be reused.

## Brief connection loss

An already open rally retains its latest hint and team state during a network interruption. The timer continues locally as an estimate; no offline station confirmations or paid reveals are queued. An offline banner explains the interruption. Clicking the station button without connectivity shows an explicit error without sending a confirmation; paid reveals and registration remain disabled until connectivity returns. Online/visibility events and the regular poll reload the authoritative team state, including confirmations that reached the server before their response was lost. A full page reload or opening the app without internet is not supported offline; map tiles also require connectivity unless already cached by the browser.
