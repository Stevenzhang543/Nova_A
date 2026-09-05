# Nova_A 26.11 template library

The launcher contains **40 starters: the original 20 plus 20 new authored recipes**. The additions comprise six small checkpoint games, seven physics teaching fixtures, and seven rendering scenes. They are intentionally small projects whose mechanics and assets can be understood and edited; they are not promises of commercial game completeness.

The new descriptors live in `src/projects/templateCatalog26_11.ts`. `src/projects/templates.ts` creates their actual scene, embedded assets, script attachments, camera, input map, tutorial, startup scene, and build settings. Existing IDs and frozen project schema remain unchanged. Every addition has English, German, and Chinese catalog names and descriptions. API/component feature names remain their technical names, and authored in-game teaching text is currently English.

## Discovery and selection

The launcher adds an All category, displayed and English metadata search, multiword matching, difficulty filtering, catalog/name/setup-time/newest sorting, a result count, and Reset filters. Search includes names, descriptions, tags, capabilities, and stable template IDs. The selected template must belong to the currently displayed results. Filtering automatically chooses the first available result, or clears selection and disables Create when none match. The exact template selected for creation is always displayed immediately above Create.

This fixes the previous behavior where filtering could hide the selected project but Create still created that hidden template. Enter in the project-name field obeys the same busy, name, path, and selection guards as the Create button.

## New games

All six games use WASD or arrow keys for movement and R to restart. Diagonal movement is normalized, movement is clamped to the authored arena, only the next checkpoint is visible, scoring advances once per checkpoint, winning freezes play, and restart resets score, timer, checkpoint visibility, and player position. Pink circular hazards use explicit world-coordinate hit tests. These are script-driven arcade rules; decorative shapes do not have hidden physics bodies.

| ID | Playable mechanic | Distinguishing recipe |
| --- | --- | --- |
| `coin-trail` | Collect six ordered checkpoints | Gentle untimed zigzag; no hazards |
| `checkpoint-sprint` | Complete eight checkpoints in 25 seconds | Alternating vertical sprint lanes |
| `slalom-run` | Reach six flags without touching hazards | Three fixed hazard islands between slalom turns |
| `orbit-dodge` | Collect an outer checkpoint ring | Two moving hazards on crossing orbits |
| `target-circuit` | Complete an eight-point course in 20 seconds | Figure-eight track that revisits its center |
| `hazard-crossing` | Cross three lanes to reach the finish | Three moving hazards with different phases and speeds |

Edit `Assets/Scripts/CheckpointGame.rhai` in each project. Reset state is implemented directly inside lifecycle callbacks because nested Rhai functions do not inherit callback export-variable scope. Bounds use explicit comparisons because the shipped sandbox does not provide `clamp(float, float, float)`. Orbit math uses the runtime's available `sin` and `cos` functions.

## New physics fixtures

| ID | Authored contents | Observe and edit |
| --- | --- | --- |
| `domino-cascade` | Twenty upright dominoes and one moving continuous-collision striker | Contact propagation, spacing, friction and sleeping |
| `pyramid-stack` | A 28-body pyramid and a static floor | Settling, friction, mass and solver stability |
| `restitution-gallery` | Six identical balls dropped from equal height | Restitution values from zero through one |
| `friction-ramp` | Four separate rotated ramps and four blocks | Material friction from zero through 1.2 |
| `pendulum-row` | Five independent static anchors and distance-joint pendulums | Different lengths, displaced starting positions and damping |
| `billiards-break` | A cue ball, ten-ball triangular rack and four cushions | Zero-gravity contacts, restitution and continuous motion |
| `gravity-fountain` | Twenty-four balls with distinct initial velocities and a catch basin | Ballistic paths, gravity, contacts and rebound |

These are inspectable physics examples, not analytical certification or exact real-world material models. Press Play, inspect Debug → Physics, then Stop to restore the authored state before changing values.

## New rendering scenes

| ID | Authored contents | Observe and edit |
| --- | --- | --- |
| `shape-poster` | Central star, six geometric forms and editable world text | Shape composition and text |
| `neon-garden` | Eighteen surrounding forms and three colored point lights | Low ambient light, color, light range and intensity |
| `particle-fireworks` | Five colored particle fountains | Velocity spread, gravity, particle lifetime and fading |
| `rain-room` | Seven rain emitters behind a simple architectural silhouette | Rain speed and ordered composition |
| `starfield` | Three particle layers with different sizes and speeds | A drifting star composition |
| `orbit-gallery` | Six scripts moving shapes around a central star | Radius, angular speed, exported state and trigonometry |
| `sprite-wall` | Twenty-four tinted instances sharing one embedded SVG sprite | Asset reuse, tint and ordering |

Particle scenes must be played to emit. The rendering examples use bounded emitters and embedded assets, so no remote image downloads are necessary.

## Verification and limits

`node scripts/verify-v26.11-templates.mjs` passed **57 checks** locally. It verifies the 40-ID catalog and 20 localized additions; German/Chinese and multiword discovery; sorting/filtering; each addition's authored scene and asset references; six-game initialization, movement/bounds, complete checkpoint progression, win/freeze/restart; both timed-game expiry paths; all three hazard-loss paths; all six orbit scripts executing a real WASM update callback; every old/new particle recipe hydrating its authored component fields; real particle simulation and visible draw submissions in four scenes; and rain foreground ordering. Its JSON report is `release-audits/v26.11-template-behavior.json`. A failed run replaces prior passing evidence with a failure report.

`node scripts/verify-template-catalog.mjs` passed **20 grouped checks covering all 40 starters**, including the full project validator, static script analyzer, exact WASM script compilation, build-default resolution, accessible UI metadata, and deterministic NovaPak creation and parse. The original baseline minimum remains 20; the new verifier requires exactly 40 for 26.11. The generic report is `release-audits/template-catalog-verification.json`; use its current recorded result, not a historical claim.

The callback checks supply deterministic context and inspect commands; they do not simulate a full rendered playthrough. Native-player execution, physical-device input, every export target, and a visually inspected complete playthrough of every new template remain separate checks. Browser interaction evidence from the main audit is recorded separately and must name the actual templates and paths exercised.

## Exact edits for the library

- `src/projects/templateCatalog26_11.ts`: added 20 stable descriptors and German/Chinese names and descriptions.
- `src/projects/templates.ts`: extended the typed catalog; added distinct scene recipes, embedded script/sprite assets, bounded particle configurations, tutorials and input maps; preserved existing factories.
- The same file fixes inherited emitter field names in Top-down/Rendering Lab and their variants: `initialVelocityMin/Max`, `gravity`, `startColor/endColor`, `startOpacity/endOpacity` in percent, and `startScale/endScale` now match the actual component. The previous names were silently ignored at hydration. Rain Room explicitly draws its silhouette in front of its rain emitters.
- `src/projects/templateDiscovery.ts`: added pure displayed/original metadata filtering and stable catalog/name/time/newest sorting.
- `src/components/ProjectManager.vue`: added discovery controls, counts, localized catalog lookup, visible-selection reconciliation, explicit selected-template copy, Enter/busy guard, semantic test selectors and responsive cards.
- `scripts/verify-template-catalog.mjs`: made original minimum-count checks additive while still verifying every currently registered factory; original baseline requirements were retained.
- `scripts/verify-v26.11-templates.mjs`: added deterministic catalog/discovery and actual WASM gameplay behavior regression coverage, with explicit evidence scope.
- This document records the features, limitations, usage, verification and per-file edit list.
