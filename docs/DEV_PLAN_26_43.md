# Nova_A 26.43 — development plan and status

Maintainer's brief for 26.43 (19 Oct 2026), with the choices made when asked:

1. Fix what earlier rounds found but had not fixed, and check again.
2. Upgrade the physics backend (own solver, no third-party engine). Reported bug: a jumping box (the template's player) that touches the edge of another box shoots upward as if flying.
3. Web: the desktop app looks right, but on iPad, iPad mini and desktop browsers text does not match, scaling is wrong, things are misplaced, and page scrollbars cover the view. Optimise the editor and exported games.
4. More features: scripting (global scripts, audio/video scripting, calls between scripts), a much simpler block programming, the independent Player (P-E2), the window structure (G1), and debug and render tools — all tested.

File-by-file record: `docs/EDIT_LEDGER_26_43.md`. No Git writes; the maintainer commits by hand.

## Status

| Area | Result | Checks |
|---|---|---|
| Flying character at box edges | Fixed at the cause: the character controller stepped up mid-air and scripts read the lift as velocity. Step and snap now need a grounded character and are not reported as motion. | `cargo test` (nova_physics regressions); `verify-2643-character-edge` 3/3 (44 jumps with the template script, real WASM) |
| Physics solver | Per-body CCD, internal-edge filtering for tile seams, ellipse contact point, contact slop and working sleep, static pair skip, early solver exit. Pyramid-20 3.47 ms/step (10.93), tile floor 0.85 ms (6.05). | `cargo test`; `physics_bench` |
| Collision callback timing (26.42 S-3) | Optional per-step dispatch (`eventDispatch: 'step'`, on for new templates, old projects unchanged). | `verify-2643-event-timing` 4/4 |
| Web / iPad | dvh-based heights, no focus zoom, phone/tablet split, system language, portable fonts with reload on font load, wide/medium/narrow layouts, full screen and automatic touch controls for games. | `verify-2643-editor-shell` (768/507 px), `verify-2643-web-player` (1280×800, 1194×834, 768×1024, 507×834, touch) |
| Scripting | Engine reuse (~170× cheaper callbacks); `call_on/call_global/call_group/after`, tags/groups, sound/music/bus, video; global scripts. | `verify-2643-scripting` 8/8; nova_script tests |
| Blocks | New Blocks tab (events, plain-word blocks, drag and drop, generated Rhai). | `verify-2643-blocks` 8/8; `blocks_fixture` |
| P-E2 Player | Independent Player is the default for Web and desktop exports (desktop: `index.html` hands game mode to `player.html`); compatibility Player lazy, automatic fallback. | `verify-2643-player-boundary` 4/4; `verify-2643-web-player` 5/5; exported Windows game run by hand (F3/F4 work) and measured |
| G1 window structure | Compact title bar (Menu button), Alt/arrow menus, F6 regions, compact docks (canvas 660 px at 1280), segmented body type, tinted Run. | `verify-2643-editor-shell` 5/5; 2641 6/6; 2640 7/7; glass 5/5 |
| Debug / render tools | Shared physics debug drawing; F3 statistics and F4 physics layer in development exports. | `verify-2643-web-player` |
| Exported game latency | Windows export, 60 Hz test scene: independent Player 15.7 / 23.9 and 17.9 / 25.7 ms (two runs) vs 26.42 export 18.3 / 25.6 ms, key down P50 / P95 — no regression. | `docs/latency-results.md` (harness, 100 trials per run) |
| Earlier defects | Audio underrun false alarm (suspended context), quarter-turn transforms exact. | — |

Container results above use Chromium (SwiftShader) and the 26.43 WASM built on Windows; the Windows run (Edge 147, real GPU) passed every check: `.cache/_latency/checks-26.43.cmd` (pnpm and Tauri builds, `tsc`, `cargo fmt/clippy/test`, Rhai signatures, 15 verify scripts; logs in `.cache/evidence-26.43/checks`) and, after the desktop Player routing change, `.cache/_latency/build-d43b.cmd` (both builds, `verify-2643-player-boundary`, `verify-2643-web-player`; logs in `.cache/evidence-26.43/checks-b`).

## Not done in 26.43

- G1 leftovers: bottom panel with three preset dock heights (it is resizable and collapsible), Inspector two-row header with a filter menu, SideBar merged into the scene side bar.
- TileMap render cache: chunk command caching already exists; animated tiles still rebuild their chunks on each animation frame. Not changed without a measured need.
- Deterministic sine/cosine for arbitrary angles across browsers (only quarter turns are exact).
- Latency stage breakdown: the exported game was measured end to end (independent Player 15.7–17.9 ms key-down P50, 26.42 export 18.3 ms in the same session; `docs/latency-results.md`), but the in-app probe sent no records in that session from any build, so per-stage numbers are N/A.

## Release

Released on 20 October 2026 to `releases/v26.43` (eleven files, all matching `SHA256SUMS.txt`) by `.cache/_latency/release-26.43.cmd`: both builds and every check (24 of 24 steps pass; `.cache/evidence-26.43/checks-release`), then `scripts/package-release-26.43.ps1`. The released editor exported a new Platformer project for Windows and Web; both games were played (`.cache/evidence-26.43/README.md`). Notes: `docs/RELEASE_NOTES_26_43.md`. To repackage after a document change without rebuilding: `.cache/_latency/repackage-26.43.cmd` or `scripts/package-release-26.43.cmd`.
