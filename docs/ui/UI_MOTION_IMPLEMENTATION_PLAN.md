# Nova_A Comfortable UI + Motion Implementation — 26.37

Preserve the established workflow, persistent shell, state owners, native input contracts and project/game data semantics. No new engine feature, renderer rewrite or dependency is required. Current user priorities take precedence over older compact UI geometry.

## Current status

| Stage | Status and evidence |
|---|---|
| 1 Baseline | Verified current 26.36 source 4601 files/d4d78307…; fresh typecheck, shared motion logic and WASM/Web build passed. Five actual Edge captures record the populated Player project, 1600×900, scale 1/DPR 1. Physical DPI/GPU unmeasured. |
| 2 Shared geometry | Implemented Comfortable 16px body/value, 14px help, 18px panel titles, 44px inputs/buttons/tabs, 40px tree rows, 20px panel inset, 12px label/control gap, 20px field gap, 28px section gap, and 12/16/24px control/panel/modal radii. Native event and ref contracts retained. |
| 3 Representative views | Shared-only defects led to actual source repairs. Earlier real development revision passed22/22 groups with five strict comparisons; representative1 remains diagnosis. Current source needs fresh browser/frozen acceptance. |
| 4 Full migration | Actual main/specialized geometry/control migration, old override repairs, gutters, widths, code-line metrics, important labels and responsive overflow are implemented. Current full-route/scaled/translated rendered acceptance remains separate. |
| 5 Motion integration | Shared spring/duration/on-light-reduced contract is implemented in actual controls, tabs/neighbors, selection, panels/dock, modal/tooltip/toast/drag.74 ordinary disclosures, Ownership lazy consumer and12 native popup callers share explicit owners; current46/46 production host checks passed. |
| 6 Regression | Current Vue/TypeScript and46/46 deterministic host logic passed. Earlier22-group GUI/nine timings/four windows is revision-specific. Current actual native disclosure development run passed9/9, including all12 menus at1024x640; remaining complete-route and frozen-source qualification are separate. |
| Latest bounded development follow-up | Rebuilt native9 passed actual all12 popup radius>=16/inset>=20 (observed20) and minimum-window hits. Layout remainder passed4/4,34 routes/41 captures/zero console exceptions; this is not the full ten-group layout or fourteen-gate final qualification. |
| 7 Release | Pending reviewed frozen-source snapshot and requalification, exhaustive edit ledger and exact eleven files in releases/v26.37. A partial GUI run or successful build is not release acceptance. |

## Implemented motion lifecycle

`src/ui/motion.ts` and `motion.css` remain the single shared system. Finite WAAPI jobs retarget current presentation; generations and job ownership suppress obsolete completions. `animateDisclosure()` exposes the latest state immediately and clips only presentation height while closing content is inert. `animateBlockSize()` supports the actual bottom-dock owner; separators, resize and KeepAlive exit cancel rather than lag behind input.

The caller inventory is74 ordinary details, one Object Ownership lazy consumer,12 native popup menus, six already-owned details and one shared property-section owner. Ownership retains outgoing content and `refreshDisclosure()` remeasures latest intent after Vue mounting. Native `data-ui-motion-popover` uses finite direct-surface presence with immediate aria/inert and trigger reversal. Feature-detected manual Popover top layer preserves DOM/Vue relationships while escaping ancestor clips; direct placement clamps/flips/bounds scrolling, with an explicit inline fallback. Live inherited color/authored-style restoration, logically-open-only size observers and outside-focus/pointer/Escape close use the same lifecycle owner.

`UiDialog`/`UiMenu` self-versus-parent ownership and real conditional `UiMotionTransition` wrappers preserve outgoing DOM and avoid duplicate owners. Modal exit locks preserve authored attributes, block underlying pointer hits and repeated close handlers, and restore on cancellation/removal. Fixed scrims use opacity while inner dialog surfaces may move. The existing modal-focus directive retains focus responsibility; final browser focus and click-through checks are still required.

Native drag images and data commits remain immediate. Bounded neighbor FLIP and non-interactive release/cancel rings supply visual settle feedback without changing hit targets or undo entries. The controller cleans disconnected registrations and preserves connected reparenting. The canvas, standalone player and authored game-control regions are excluded.

Normal feedback is enabled. Low-end/decorative off selects light feedback, not Reduced Motion. User/system Reduced Motion settles latest owned completions immediately and suppresses later WAAPI presentation. Unsupported animation support also completes without delaying data or focus. Native OS select popup windows/title tooltips and already unsupported resource/free-floating/clip drag routes are explicit coverage limits.

## Consequences and boundaries

Larger geometry intentionally shows fewer fields at once; normal scrolling, grouping, responsive overflow and dock width replace compressed text. Virtualized lists measure the effective row height. Resizing and exact editing remain immediate. All edits and consequences belong in the release edit ledger; existing user changes are preserved.

Only changes linked to this visual/motion migration receive focused checks. Preserve source binding, native/Web/version identity and prior engine compatibility qualification. Avoid unrelated duplicate security, feature or long-soak audits. Unavailable physical GPU/display, AT and native-installer observations remain explicitly unverified.

## Development evidence

- `reports/comfortable/26.37/baseline`: protected36 identity/measurements, five actual before captures and nine timing/four raw counter-window observations.
- `.cache/comfortable26.37/representative1`: first shared-only build/captures and discovered defects; historical diagnostic evidence.
- `reports/comfortable/26.37/implementation/observed-navigation-and-tilemap-fix.json`: current46/46 production host logic and typecheck receipt with source/test SHA and deterministic host limitations; the older28 cache is historical.
- `.cache/comfortable26.37/motion-lifecycle-edit-report.json`: per-edit lifecycle/dock/controller changes and consequences.
- `.cache/comfortable26.37/important-label-edit-report.json`: five actual property-label repairs and scoped CSS compilation checks.
- `release-audits/v26.37-comfortable-user.json` and `release-audits/v26.37-comfortable-performance.json`: earlier22/22 actual development groups, five strict captures and nine/four raw observations; later source changes require fresh reports.
- `release-audits/v26.37-native-disclosures-user.json`: current actual development9/9 passed, eight groups at1600x900 and all12 menus at1024x640/DPR1/UIscale1. Normal-panel viewport/midpoint/every enabled-control hits passed with no maximize or create/delete action. Script/method corrections have public per-edit receipts; failed attempts1–4 remain diagnosis. This is not frozen-source qualification.
- `release-audits/v26.37-ui-rebuild-layout-remainder.json`: latest partial development4/4,34 routes/41 captures and zero console exceptions, qualifiedRelease null. Full ten-group layout and all fourteen fresh frozen-source gates remain required.
- `.cache/comfortable26.37/motion-doc-edit-report.json`: this existing-document reconciliation.

Final release evidence must contain the actual fourteen source-bound gates, reviewed current comparisons and independent exact-eleven-file source/Web/evidence/native/checksum verification. Explicitly omitted unrelated audits are not marked passed. No source freeze, complete qualification or publication is inferred from this implementation plan. Do not ship a private unfiltered patch or turn partial/headless results into hardware, AT or installer certification.


Current linked follow-up: opacity-preserving finite workspace handoff passed all15 actual frame traces with zero blank samples and six navigation/state groups. Real TileMap fieldset/section geometry now uses20px field gaps,28px groups and20px four-way inset; its original populated conditional group and geometry assertion passed. Hover-only selected-value hints now clear removed/inactive ownership, and four actual keyboard/project-removal/latest-reentry groups passed. These development receipts are explicitly unqualified; the complete frozen-source fourteen gates and eleven-file delivery remain the release authority. Granular edits, source hashes and intermediate failed-candidate context: reports/comfortable/26.37/implementation/observed-navigation-and-tilemap-fix.json.
