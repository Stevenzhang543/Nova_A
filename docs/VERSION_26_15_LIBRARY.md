# 26.15 — template library discovery and startup audit

Integration notice: this journal retains historical staged paths, intermediate failures and pending-at-the-time entries. Its reviewed authored files are integrated for26.15 after26.14 was separately finalized. Current behavior and final evidence boundaries are in [26.15 release notes](RELEASE_NOTES_26_15.md); source-bound executed gates determine production/native qualification. Copied build/check roots and generated reports are not promoted as source authorities.

This is the isolated library contribution under `.cache/development-v26.15`. It does not declare all of 26.15 complete. The root agent owns the asset/rendering integrations, final merged qualification, metadata and release outputs.

## Inspected behavior and consequences before editing

The existing launcher offered category/difficulty/search/sort controls and 40 stable IDs. It had no scene previews, input requirements, per-entry controls, expected results or related help links. Several focused entries reuse an existing game's complete foundation. The preexisting variant helper overwrote its foundation tutorial with generic prose, leaving the focused entry without the underlying controls.

The optional networking factory enabled a WebSocket connection to `ws://127.0.0.1:7777` immediately, although it did not launch a server. The approved change makes newly created optional-network samples start offline. Both replication descriptors, package, endpoint and explicit opt-in configuration remain. Existing saved projects are not rewritten.

Actual pointer/keyboard testing reproduced a direction error in Top-down: the live Inspector moved from `[0, 0]` to `[0, -2.0123839442290032]` when W was held for 300 ms. Its script passes `Move.y` directly to world velocity, but W had been authored as negative Y and S as positive Y. Only the factory's W/S vector bindings were swapped. Tile World shares that factory and receives the same correction. A/D, E, scripts and global input handling retain their behavior. Stop must restore the authored `[0, 0]` position.

The narrow browser audit also reproduced select-label clipping: a generic `.creation-card label` rule applied its 46% width inside the filter grid, leaving controls about 84 px wide. The new component-scoped rule gives each filter label its whole allocated column. Existing container breakpoints still stack those columns.

Before UI changes, all 40 templates were created through visible launcher cards, run in the Game view, checked through the actual Console and stopped. Those actual running viewport screenshots became the source previews. No generated SVG, synthetic diagram or VM/application-state injection supplied the images.

## Exact authored file ledger

| File | Every logical edit and consequence |
| --- | --- |
| `src/components/ProjectManager.vue` | Imports localized guide metadata and Vite-resolved PNG URLs; replaces decorative icon cards with lazy-loaded real Game previews and descriptive image names; adds localized requirement badges; extends existing search with controls, expected results and requirements; shows the selected entry's controls/results and reused foundation in a readable two-column region that becomes one column when narrow; adds named feature-manual and related-task buttons that open real locale-prefixed bundled anchors; localizes the launcher utility navigation name; adds scoped preview/badge/help layout and corrects the inherited filter-label width. Removes the now-unused icon map. Keeps catalogue IDs/order, existing translations, categories, selection/filter reset, creation, project paths, opening, migration, recent projects and serialization behavior. |
| `src/projects/templateGuides.ts` | New typed, indexed guide catalogue covering exactly the existing 40 IDs. Supplies EN/DE/ZH controls, expected results and requirement badges, existing feature/task anchors and eight explicit reused foundations. Unknown IDs fail explicitly. Describes the supplied audio/menu action limitations rather than advertising unbound behavior as complete. |
| `src/projects/templates.ts` | Imports guide metadata; newly created optional-network projects default to disabled networking and the factory audit enforces that offline default with two replication targets; swaps only Top-down W/S Y bindings; appends all three localized control/result/requirement sections to each existing Getting Started tutorial; recalculates actual source byte length and all retained pipeline source/content/artifact/cache hashes plus `lastValidSource`. Original tutorial content and assets are retained. Existing authored projects are untouched. |
| `scripts/verify-v26.15-template-library.mjs` | New real Edge input audit for localized discovery, actual help navigation, narrow controls, all 40 visible starter selections/creation/Play/Console/Stop and actual screenshot pixel output. Checks offline networking creates no WebSocket, and Top-down/Tile World W/S direction plus Stop restoration through live Inspector coordinates. Reads DOM and rendered output; mouse/keyboard input performs application changes. A centered DOM scroll keeps tested inputs clear of the sticky header; there is no app state mutation or VM injection. Screenshots go into audit evidence, preserving frozen source assets on repeated qualification. |
| `scripts/verify-v26.15-library-metadata.mjs` | New focused programmer audit for stable IDs/order, complete locale metadata and all localized anchors, 40 bounded PNGs, instructional search, all generated project schemas/tutorial integrity, offline replication configuration, W/S bindings, disclosed foundations and compiled Vue SFC bindings. Uses the installed `vue/compiler-sfc` export. |
| `scripts/fixtures/v26.15-template-library.json` | Stable 40-ID/order fixture captured from the actual launcher baseline; reusable without `.cache`-only fixture dependencies after release promotion. |
| `docs/VERSION_26_15_LIBRARY.md` | This consequence review, exact ledger, source-preview provenance, verification instructions and limitations. |
| `reports/template-library-baseline.json` | Preserved first all-40 visible startup evidence before new library presentation; includes the approved offline-network default. |
| `reports/template-preview-pixels.json` | Measured source PNG dimensions/content counts. Blank has zero non-background pixels as expected; every other entry has visible rendered content. |
| `reports/library-metadata.json` | Final focused programmer verification output and source-preview footprint. |
| `reports/template-library-final.json` | Final **41/41** actual Edge scenarios: localized presentation and all 40 starters, with decoded screenshot pixels, zero error/fatal Console messages and measured W/S/Stop behavior. |
| `reports/template-catalog-verification.json` | Preserved existing 20-check catalogue output against this development overlay. |
| `reports/template-library-discovery.png` | Actual rendered desktop library capture; the native language dropdown is visible from the preceding selection. |
| `reports/template-previews/<stable-id>.png` | Forty final audit-evidence screenshots, separate from the immutable source previews listed below. |
| `reports/library-build.log` | Final development production-build output; existing large-chunk/dynamic-import advisories remain. |

The 40 individually authored preview files are listed below. They total **841,473 bytes** and each is an unmodified **1518 × 553** PNG captured from the visible running Game viewport. Source images are imported via Vite so built/packaged URLs are resolved and hashed correctly. Cards use lazy loading and contain the full captured frame. The caption identifies them as runtime previews and states that the displayed frame and renderer can affect color/motion.

| Preview file | Bytes | SHA-256 |
| --- | ---: | --- |
| `src/assets/template-previews/empty.png` | 3,769 | `0dd988479e3121e4d7eee995cf8c9507c1b97ce6cf3da49225d157a3acd0e275` |
| `src/assets/template-previews/physics-sandbox.png` | 7,587 | `1ee1541a4730d8e6cb0881d4788491b1066600bbeb80df08d68aa54f3c17b1be` |
| `src/assets/template-previews/platformer.png` | 30,111 | `2dda342b0eab2c717e4c2284645a03e9f9c4a6b79f7cf3aa5d9e3d0e5fb07243` |
| `src/assets/template-previews/top-down.png` | 15,071 | `39ccbd2694fa929ff5229a0184fd5334f4e2a5a60271673872204199ae26c82b` |
| `src/assets/template-previews/lighting-starter.png` | 55,423 | `7e0b49081e1242d72a193215a0d2d22975b7f32a2ebb5f2bbc76428d8e8b2309` |
| `src/assets/template-previews/tile-world.png` | 17,245 | `6edfc6c0626a95a0d7ab62bd0439e62190be15629cb3a88a72e9043ea4f866a9` |
| `src/assets/template-previews/responsive-ui.png` | 11,069 | `1e8d23b249218f45e78bb32a3966546393fde0dc24a495110df2ef0feb1cb33b` |
| `src/assets/template-previews/collision-lab.png` | 30,135 | `10cd6bac73aad3b2fef9d3e9022bde0cdb6f6ed606c086c9451f33bbb46ebd5d` |
| `src/assets/template-previews/rendering-lab.png` | 55,185 | `3c11972c5558456e9dcee7c133c13aa0beaa620c9af07d8038d9442e6eaff5af` |
| `src/assets/template-previews/ui-showcase.png` | 11,069 | `1e8d23b249218f45e78bb32a3966546393fde0dc24a495110df2ef0feb1cb33b` |
| `src/assets/template-previews/networked-optional.png` | 7,378 | `ae218e2e0620e27ab2495cb5e53f89aa94fd72b5da139ed85eeee4ff22dc9f92` |
| `src/assets/template-previews/particle-lab.png` | 47,059 | `030ad60f03a03b34035f6001f8c6e8417b60a949320548500e7cccd23fbf08a7` |
| `src/assets/template-previews/audio-lab.png` | 11,069 | `1e8d23b249218f45e78bb32a3966546393fde0dc24a495110df2ef0feb1cb33b` |
| `src/assets/template-previews/animation-lab.png` | 41,633 | `f0d683f9955db180921f98df676caf4765d1d0e8f560fb7c29d328e40476d9c8` |
| `src/assets/template-previews/mouse-knockout.png` | 11,182 | `0196827c719ea450428af325111dd775948c5cbe23679e0fc96d3a0bd8df4158` |
| `src/assets/template-previews/snake.png` | 10,968 | `24ab1d8bfbfd7c7da60251c929e7fc66f168561f5acb067186fb518e6b5e165e` |
| `src/assets/template-previews/pong.png` | 13,329 | `e5a82e6f4457bba66c63fd831f5136fa2ab3a52b95a07c6b39f9fb352e721344` |
| `src/assets/template-previews/breakout.png` | 17,176 | `457f9a93f594104a0e87416632c73c8d6bff4bd5774e854bfc016201a68c9ce7` |
| `src/assets/template-previews/physics-cleanup.png` | 16,280 | `45d79c701b89ffba6bec50acab2d29c8167d098cbc93a5b52ab21a33f1ef59e3` |
| `src/assets/template-previews/grid-chase.png` | 11,158 | `f8f36731f516dfdad12a7b96eb85a542df3c21ab87abb2613e37ebef57bba90b` |
| `src/assets/template-previews/coin-trail.png` | 14,402 | `ea19bace636405c90c4cdfd45f848f6e1026401e9b046cac139bf65ea2f2bd4e` |
| `src/assets/template-previews/checkpoint-sprint.png` | 16,594 | `a370f13dd974473268784523447a42cb5f5eff1ae18d87fa2d40a04b71301e31` |
| `src/assets/template-previews/slalom-run.png` | 21,901 | `b046148bbcb68e3d076eacacac3c2dc7dc01d5edcafc629ad04a3073d0e0e6ac` |
| `src/assets/template-previews/orbit-dodge.png` | 19,959 | `288baebce1195e1e5f3d2ad9b4542c01a72ebd96d74598373b2d110d6b85814e` |
| `src/assets/template-previews/target-circuit.png` | 11,122 | `575ebef7b305cc1e314a266f12534b83237a34c1873c4c2b05b0c3e55ff684a1` |
| `src/assets/template-previews/hazard-crossing.png` | 14,351 | `f4b5d7dcc40a7a6b537c949eb81956eb324452a332cbec917b90b6da657feab4` |
| `src/assets/template-previews/domino-cascade.png` | 18,376 | `8354946ed08af738df320906f8d249b94ce3d909a68db88dfd766de3247d5bc8` |
| `src/assets/template-previews/pyramid-stack.png` | 11,914 | `ad04212330a9c681d5f758911e5109d659c985394292a9d9a12a7b2a23837eec` |
| `src/assets/template-previews/restitution-gallery.png` | 20,012 | `f525d377410b69cd242479b26bda7c4bb2d54aa94301c337b78a2de8dc4f46cc` |
| `src/assets/template-previews/friction-ramp.png` | 36,302 | `65deac050656e85f50278e08a49ce9f52fc5f6fcb34a38cba5bce86ef14e17c9` |
| `src/assets/template-previews/pendulum-row.png` | 15,632 | `df35e34a38a3bd90b842ccd79f50bf682f95b5e0c2a2f79fe150d21e542512a5` |
| `src/assets/template-previews/billiards-break.png` | 27,871 | `a63c674fbb61c574ce858873bb4e484d3f9604070e44a9494f1814d261c424b1` |
| `src/assets/template-previews/gravity-fountain.png` | 26,623 | `e7b303105ff7004e3bc8d87f694d982ec524b6b1e32de4fa66aef932beb45621` |
| `src/assets/template-previews/shape-poster.png` | 26,963 | `6e85e4f36cd6eb7a503eaf45eb7788f0d784daaa7156020281ebf5a49f9d9968` |
| `src/assets/template-previews/neon-garden.png` | 57,112 | `4141fe5489aa1ce2f340d01f4a0e60224c23110a84b2c2d57f2784de250134e9` |
| `src/assets/template-previews/particle-fireworks.png` | 15,085 | `865c4cdf936c8a79a8466934f0b7b83c640b6b818d5d1b2c9fd1eb0ef30df26c` |
| `src/assets/template-previews/rain-room.png` | 8,708 | `f39b1f8d8a621b9c1906c460d9fdbfdbfc14764e713cff3b4a1ce5b227c11ffe` |
| `src/assets/template-previews/starfield.png` | 11,462 | `eedc17f662c3b45771bf3a79eb3de757f8b9f55343a5e2ef065b78f7ae963593` |
| `src/assets/template-previews/orbit-gallery.png` | 10,021 | `a74825cc70f71954322a038343f5b50345ecd6e9ac67db2856007f7cb637f033` |
| `src/assets/template-previews/sprite-wall.png` | 33,167 | `0f07f8a63782de626659df0044610a4209ad7509dacb916676b04014210ec601` |

## Contracts and intentional limits

`templateGuide(id, locale)` returns `{controls, expected, requirements, manualSection, taskSection, foundation?}`. Locale is `en`, `de` or `zh`. Chinese bundled manual links use its existing `zh-CN` anchor prefix. Feature and related-task destinations are existing published anchors; no creator-learning IDs or 26.14 Object Family lesson files were changed. Related task means related workflow, not a claim that every starter has a dedicated full-length game tutorial.

The focused aliases are Lighting Starter → Rendering Lab, Tile World → Top-down, Responsive UI → UI Showcase, Particle Lab → Rendering Lab, Audio Lab → UI Showcase, Animation Lab → Platformer, Physics Cleanup → Mouse Knockout and Grid Chase → Snake. Their foundations are now visible. Audio Lab/UI Showcase include an audio asset, but it is not automatically attached to UI clicks. The sample Play button emits its action without supplying a second game scene. Optional Networking supplies two replication objects but does not invent player movement or launch a server. These boundaries are stated before creation and retained in the embedded instructions.

Startup evidence confirms every entry can be selected, created, played and stopped without hidden downloads/server setup, produces its expected empty/nonempty output and emits no error/fatal runtime Console log in the measured interval. It does not assert winning every game, long-duration stability, all controller/hardware input paths, physical audio output, native OS file-picker behavior, every possible renderer/driver, or release-export qualification. Existing broader catalogue tests cover project/schema/script/build/package contracts separately. Whole-version qualification remains the root agent's responsibility.

## Reproduction

The independent development root is `.cache/development-v26.15-library-check`: active 26.13 presentation metadata plus staged 26.14/26.15 source, with the actual staged 26.14 WASM. It is explicitly a development overlay, not a qualified 26.15 release. It was copied from the root's preview root to avoid rebuilding another agent's running browser.

```powershell
node .cache/development-v26.15/scripts/verify-v26.15-library-metadata.mjs --source-root=.cache/development-v26.15-library-check --report=.cache/development-v26.15/reports/library-metadata.json
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p .cache/development-v26.15-library-check/tsconfig.json
$env:NOVA_AUDIT_ROOT='E:/Nova_A/.cache/development-v26.15-library-check'
$env:NOVA_AUDIT_EXPECTED_RELEASE='26.13'
$env:NOVA_AUDIT_DEVELOPMENT='1'
node .cache/development-v26.15/scripts/verify-v26.15-template-library.mjs
```

The browser verifier defaults to the current working directory, expected 26.15 and non-development qualification when these overrides are absent. `NOVA_TEMPLATE_IDS` selects a bounded subset for reproduction; `NOVA_TEMPLATE_DISCOVERY_ONLY=1` runs presentation workflows only. Neither reduced mode is the all-40 qualification result. `NOVA_TEMPLATE_PREVIEWS` can explicitly select another evidence directory; the default is `release-audits/template-previews` in the checked root.

## Verification

- Focused programmer suite: **9 groups passed**, plus the preview-footprint metric. All 40 generated projects and 240 localized feature/task anchor references are checked.
- Existing `verify-template-catalog.mjs` against the isolated merged root: **20 checks passed**, covering project validation, script analysis/actual WASM compilation/execution checks, build settings, deterministic NovaPak generation and existing containment contracts. Unchanged solver source was copied into the temporary check root to satisfy that verifier's source inspection prerequisite; no solver edit was made.
- Merged `vue-tsc --noEmit`: **passed**.
- Final production development build: **passed**.
- Final visible Edge suite: **41/41 scenarios passed** (one EN/DE/ZH discovery/help/search/narrow-layout scenario and 40 real launcher→Create→Play→Console/pixels→Stop starter scenarios). `reports/template-library-final.json` includes exact output, runtime image statistics and Top-down/Tile World actual W/S positions. Both directions pass and Stop restores `[0, 0]`. Optional Networking opens no WebSocket. Browser exception list is empty. This measured development result is not substituted for the final release qualification.


## UI foundation regression follow-up

The initial all-40 startup pass proved visible output and error-free startup; it did not prove every caption or numeric range. A focused production-hydration regression reproduced unsupported Button.text being discarded and a value68 ProgressBar clamping to its implicit maximum1. Root corrected the new-template factory to create a real Text with menu.play localization, author min0/max100/value68, and use Menu Panel layout None so stored child positions are respected. Existing saved projects are not rewritten. Actual screenshot review also exposed literal input/toggle tokens: Checkbox.localizationKey now resolves menu.sound with the Sound enabled fallback; TextInput.placeholder uses Player name because15 has no placeholder-token binding.

| File | Every follow-up edit and consequence |
| --- | --- |
| `src/projects/templates.ts` (root-owned) | Adds supported Text to Button, explicit progress range and None panel layout; supplies Checkbox localizationKey/fallback and literal TextInput placeholder. New UI Showcase, Responsive UI and Audio Lab projects inherit these fixes. No runtime or old-project migration change. |
| `scripts/verify-v26.15-template-ui.mjs` (new) | Seven actual factory, WASM migration/hydration and NovaPak reopening groups assert supported fields, localized captions/checkbox label, readable placeholder, numeric range and exact child positions; negative old data reproduces the previous missing-caption/full-progress failure. Source-root/report CLI arguments identify the actual engine and development context. |
| `scripts/verify-v26.15-template-ui-user.mjs` (new) | Six real browser groups create the three starters using visible controls, inspect Text/Checkbox/placeholder/range/layout fields, Play and check rendered checkbox accessibility label, caption glyphs,68% progress pixels and authored geometry, then Console and Stop. No application-state/VM injection. Repeated qualification writes evidence without altering source previews. |
| `src/assets/template-previews/ui-showcase.png` | Replaces only this source image with its final real running Game screenshot; exact bytes/hash are above. |
| `src/assets/template-previews/responsive-ui.png` | Replaces only this source image with its final real Game screenshot; the shared UI Showcase foundation remains disclosed. |
| `src/assets/template-previews/audio-lab.png` | Replaces only this source image with its final real Game screenshot; no automatic audio playback is claimed. |
| `reports/template-preview-pixels.json` | Refreshes only these three source-image metric entries; refreshed chromatic counts use channel spread>35. Other37 entries remain unchanged. |
| `reports/template-ui-previews/{ui-showcase,responsive-ui,audio-lab}.png` | Three new evidence copies, byte-identical to corresponding source images. Earlier all-40 screenshots in reports/template-previews remain intact. |
| `reports/v26.15-template-ui.json` | Fresh seven-group programmer results including the negative legacy reproduction. |
| `reports/v26.15-template-ui-user.json` | Fresh six-group browser results with Inspector values, pixel metrics, preview hashes and12 full-window capture references in the isolated root. |
| `docs/VERSION_26_15_LIBRARY.md` | Records corrections, every changed file, three refreshed hashes/total, actual checks and limitations. |

Final result: **7 programmer groups and6 actual browser groups passed**. Browser evidence was generated at 2026-09-05T13:06:46.434Z from .cache/development-v26.15-render-user-check (actual engine26.14.0 plus staged15 source; development=true). Each1518×553 crop shows Play, Player name, Sound enabled and partial progress; all three fill ratios measured 0.681818 against0.68±0.025. No error/fatal Console messages or browser exceptions were recorded. Final isolated Vite build passed with existing chunk warnings. This does not replace fresh all-40 qualification or establish audio playback, additional scenes, alternate locales, every responsive breakpoint or native output.

```powershell
node .cache/development-v26.15/scripts/verify-v26.15-template-ui.mjs --source-root=.cache/development-v26.15-render-user-check --report=.cache/development-v26.15/reports/v26.15-template-ui.json
$env:NOVA_AUDIT_ROOT='E:/Nova_A/.cache/development-v26.15-render-user-check'
$env:NOVA_AUDIT_EXPECTED_RELEASE='26.14'
node .cache/development-v26.15/scripts/verify-v26.15-template-ui-user.mjs --development
# Promoted15 qualification omits development environment overrides:
node scripts/verify-v26.15-template-ui.mjs
node scripts/verify-v26.15-template-ui-user.mjs
```
