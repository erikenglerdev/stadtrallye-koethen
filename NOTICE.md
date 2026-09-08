# Attribution and license notices

Köthener Stadtrallye is an adaptation of **Scavenger Hunt** by **Vincent CHALAMON**, credited by the original project for its original idea, design and development.

- Original project: https://github.com/vincentchalamon/scavenger-hunt
- Original developer: https://github.com/vincentchalamon
- Upstream baseline: dd9d2039eb2a30b39a301bd94f23f04a4708f8ed
- Adaptation maintained by Erik Engler: https://github.com/erikenglerdev/stadtrallye-koethen

The original project is licensed under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**. This adaptation is distributed under the same license, except third-party material covered by its own terms. The unchanged full license, including its disclaimer of warranties and limitation of liability, is in [LICENSE](LICENSE): https://creativecommons.org/licenses/by-nc-sa/4.0/ . No endorsement by the original developer is implied.

## Changes from the original

The adaptation adds a German Köthen GPS rally with a configurable circular route, fictional sample clues, team registration and shared progress, server-side timing and penalties, a read-only dashboard, local simulation, connection-loss handling, and Docker/GHCR distribution. It retains and adapts original components, styling and legacy example hunts. Git history records individual changes. The original author is not presented as the author of these changes.

## Third-party material

Third-party software, fonts, map data and other separately licensed material retain their own licenses; the project's CC license does not replace those terms.

Original credits are retained in [docs/legacy-examples.md](docs/legacy-examples.md), including Next.js, TypeScript, Zod, React, OpenStreetMap contributors, Leaflet, React Leaflet, Leaflet GeoSearch, Nominatim, Bootstrap, React Bootstrap, driver.js, React Page Flip (Oleg Nodlik), React Three Fiber (Poimandres), Fontsource, Inter Tight (credited upstream to Rasmus Andersson), Geist Mono (Vercel), Playwright, GitHub Actions and GitHub Copilot.

Adapted components additionally retain their original MIT license texts in `licenses/`:

- React Card Flip — Aaron Wong: https://github.com/AaronCCWong/react-card-flip
- React Looking Glass — Josh Mc Farlin: https://github.com/Josh-McFarlin/react-looking-glass
- React Scratch Card — Shudhanshu Gunjal: https://github.com/gshudhanshu/react-scratchcard-v4

The build collects installed dependency license and notice files, including bundled notices and font licenses, into `/legal/third-party-notices.txt`. This is an inclusive inventory, not a statement that every listed package is executed in production. Container base-system notices remain in the image (for example `/usr/share/doc` and Node's own license files).

Maps: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright (ODbL). The attribution remains visible on the map.

## Redistribution and deployment

Keep the original attribution, license, disclaimer and change notices when sharing this adaptation, its assets or container images. Shared adaptations of the CC-licensed material must use CC BY-NC-SA 4.0 or a license allowed by its ShareAlike clause. Use must satisfy the license's NonCommercial condition; do not impose additional restrictions on the licensed material.

The public `/lizenzen/` page provides these notices without login. Generated legal files are also shipped in the Docker image under `/app/public/legal/`; the original license and this notice are included under `/app/`.

## Scope of the review

The repository's license and supplied credits have been retained; ownership and permissions for every legacy photograph, example text or externally supplied route have not been independently established. Organizers must have the necessary rights for route material, replacement clues, photographs and other later additions. Noncommercial use does not by itself resolve third-party copyright, trademark, personality or privacy rights. This technical attribution review is not a binding legal clearance for an event.
