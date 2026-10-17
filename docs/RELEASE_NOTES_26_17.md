# Nova_A 26.17 release notes

Engine **26.17.0**, Project Format **2**, public schema **29**. This is the separate physics, navigation and world-gameplay milestone after 26.16. Existing 26.12–26.16 releases and the 40 library starters remain intact.

## Physics and characters

Typed native/WASM queries validate finite inputs and bounds, apply child masks/sensors/exclusions before selecting a hit, preserve child identity and resolve TileMap bodies to their owner. Nearest ellipse points use bounded geometric refinement; continuous ellipse sweeps use analytic contact candidates rather than distance-dependent sampling. A saturated query reports an explicit limit instead of silently returning a partial result.

Retained bodies now receive material, mass, geometry, masks, CCD, sleep and ownership edits consistently. Effective material assets do not overwrite inline authoring values. Signed parent scale reaches collision geometry and automatic mass. Position iterations perform independent contact correction; velocity iterations retain their purpose. Animation ownership prevents a second physics integration. Component joints preserve their broken state until explicitly rearmed. Rope record growth/shrink and constraint fields remain distinct.

Characters include enabled compound-child offsets/rotation in a conservative envelope, check overhead clearance before stepping, refresh idle floors and moving supports, preserve one-way normals under reflection and commit one collision-safe movement per fixed tick. The envelope deliberately encloses compound gaps; it is not an exact concave character cast. Cloth is the existing body/constraint lattice, without a fabric/self-collision claim.

## Navigation, AI and streaming

Navigation captures actual source geometry, transformed TileMaps and content changes. Agent clearance, masks, source edits and disabled entities invalidate cached data. Continuous segment clearance protects polygon paths; weighted directed links chain between islands. Grid AStar, hierarchical fallback and FlowField retain bounded caches. Bake work is cooperative, cancellable and atomic: a stale or cancelled operation cannot publish a partial grid. Dynamic obstacles, acceleration, avoidance and repath limits reach live agents.

AI retains per-entity blackboard and lifecycle state, applies authored revisions, orders perception consistently and bounds shared-subtree evaluation. Deferred agents consume bounded signal generations when their tick arrives. Streaming now prepares and activates actual entity/connection membership, accounts for shared scene ownership, preserves authored enable flags and stable UUIDs, and retires/restarts runtime lifetimes. Invalid identity, stale completion, budget admission and malformed handoffs fail explicitly. Cancellation stays cancelled until Retry or a meaningful new source request.

Origin shifting translates retained native records, previous/current state, contacts, constraints and rope points together with navigation, particles, camera and streamed coordinates. It preserves handles, velocity and sleep state. Persistent streamed descendants preserve world transforms; reopening cannot shift a persistent rope twice. Portal arrivals resolve against the committed destination and prevent immediate bounce. Reset clears a previous session's error.

## Authoring and teaching

Physics/World Studio forms now provide EN/DE/ZH units, bounds, readable numeric controls, contextual labels and reachable scrolling. A dedicated status panel separates observations from authored values and exposes actual Bake, Cancel, Retry and origin-shift actions. Existing rope editing opens its saved physics stage directly; Save preserves connection identity and hidden settings, while Cancel and Undo/Redo keep their intended semantics.

Seven separately versioned references include three physics workflows, code/blocks/mixed Coin Trail and the retained renderer-disabled authority. The physics references contain visible X/Y readouts through ordinary Rhai/UI APIs. Their persistent timer uses an exported property; ordinary callback locals are not persistent state. Complete English, German and Chinese workflow lessons and the generated declared-field manual are included in the offline manuals. All 120 starter lessons and historical version lessons remain.

## Qualification and limits

The acceptance plan requires all 21 common production gates, focused native/WASM/format/physics/navigation/streaming regressions, actual authoring and exact downloaded-player checks, and 1,134 additional layout surfaces: 21 surfaces × three locales × three text scales × two themes × three viewport widths. The evidence bundle identifies the frozen source digest, actual commands, screenshots, authored downloads, host/workload timing and all failures preceding the qualified candidate. These notes describe the candidate; only passing source-bound reports and independent package verification establish release qualification.

Queries, navigation caches, AI and handoffs have explicit resource limits. Measured performance is specific to the recorded host and workload; no universal maximum-performance or error-free claim is made. Browser audits use real mouse/keyboard with headless software rendering. Combined export-to-player navigation in a reused local browser process timed out; separate fresh-process runs of the exact downloaded ZIPs are recorded individually. Physical assistive technology, minimum devices, other OS hosts, publisher signing, disposable installation and long-duration soak remain external qualifications. The inherited authority reference disables its renderer in a WebView; it is not a windowless native server.

See [every changed file and consequence](EDIT_LEDGER_26_17.md), [implementation journal](VERSION_26_17_PHYSICS_WORLD.md), [declared-field manual](PHYSICS_WORLD_FIELD_MATRIX_26_17.md), [English workflow](PHYSICS_WORLD_LESSON_26_17.en.md), [Deutsch](PHYSICS_WORLD_LESSON_26_17.de.md), [中文](PHYSICS_WORLD_LESSON_26_17.zh.md), and [acceptance tracker](IMPLEMENTATION_TRACKER_26_17.md).
