# Nova_A Motion & Interaction System — 26.37

## Active priorities

The current user requirement replaces the compact, nearly imperceptible motion rules from 26.35. Comfortable geometry and readable type remain enabled during animation. Input, focus, selection, history and domain coordinates commit immediately. Motion communicates the resulting UI state and never changes project or game data.

Reuse `src/ui/motion.ts` and `src/ui/motion.css`. One finite presentation job owns each element; a newer action retargets the current visual state. No `transition: all`, queued obsolete actions, continuously running idle spring simulation, or independent panel easing families.

## Shared presets and timing

The implemented normalized spring families and semantic durations are:

| Preset | Stiffness / damping / mass | Production use |
|---|---|---|
| Snappy | 700 / 34 / 1 | Button release, selection marks, short closing feedback |
| Smooth | 360 / 28 / 1 | Disclosure height, tabs/FLIP, panel expansion, menus and dialogs |
| Elastic | 480 / 22 / 1 | Bounded drag release/cancel settle feedback and selected launcher feedback |

| Shared duration | Value |
|---|---|
| micro | 120ms |
| fast | 180ms |
| standard | 240ms |
| emphasized | 320ms |

`sampleSpring()` samples the analytical damped response once, with at most 61 normalized keyframes and a final target of exactly 1. WAAPI plays those frames using the selected semantic duration; the returned oscillator settling horizon is not an extra wait or an idle simulation. CSS tokens use the same four durations. Inputs and precise pointer edits do not wait for animation.

## Production coverage and owners

| Family | Actual production owner and behavior |
|---|---|
| Buttons, native fields, checkbox/radio/toggle, slider | Shared CSS plus the finite delegated controller installed by `installUiMotion()`. Press is immediate; release is bounded. Fields animate surface/border/validation, rather than their text. Toggle knobs and range thumbs provide feedback while native state/value updates immediately. |
| Tabs, trees and lists | `UiTabs` uses measured indicator/content feedback; committed reorders use `captureRects()` / `animateReorder()` for at most 80 mounted neighbors. Hierarchy changes immediately update virtual rows; no long-list stagger is added. |
| Inspector and property groups | `UiPropertySection` and explicitly marked native details use `animateDisclosure()`. Object selection/content owners reuse shared presence without remounting the whole shell or changing project selection semantics. |
| Panels and bottom dock | Real visibility owners use `UiMotionTransition`. `EditorBottomPanel` animates open/close block height, retains outgoing content until completion and makes it inert immediately. Separator edits and window resize cancel height presentation and apply natural geometry directly. |
| Menus, popovers and dialogs | `UiMenu`, `UiDialog` and explicit conditional `UiMotionTransition` callers retain their outgoing DOM for a real exit. Self/parent ownership prevents duplicate animations. Modal scrims stay fixed and hit-testable; only the dialog surface may move. |
|12 native popup callers | Explicit `data-ui-motion-popover` uses `animateNativePopover()` on direct non-summary surfaces, with finite presence, immediate logical aria/inert, feature-detected manual top layer and bounded inline fallback. Summary remains available for reversal. |
| Tooltips, toast and status feedback | `selectValueDetails.ts` owns the custom selected-value tooltip; `EditorFeedback.vue` owns banner/status presence and toast entry/exit/reorder. Native browser `title` tooltips and native select popup windows remain browser/OS owned; no custom fade is claimed for them. |
| Launcher and specialized tools | Project-manager and real editor surfaces use the same control rules and marked presence owners. Existing animation, tile, physics, game-UI authoring, input-map, resource, settings and debugger/profiler controls inherit shared feedback; their exact timeline/canvas/data positions are excluded from spring delay. |

This table records implemented source ownership. The caller classification is74 ordinary disclosures, one Object Ownership lazy consumer,12 native popups, six already-owned details and one shared property-section owner:94 inventoried elements without duplicate owners. Current complete rendered/dynamic and frozen-source acceptance remain separate from this inventory.

## Precision, drag and state boundaries

The delegated controller excludes `.canvas-container`, `.player-root` and `[data-game-ui-control]`. Authored game controls and game motion are not editor motion. Slider values, viewport objects, keyframes, tile/graph/waveform coordinates, resize separators and native drag anchors follow input directly.

Content details are `details.ui-property-section` and `details[data-ui-motion-disclosure]`. Latest `data-ui-disclosure-open`, summary `aria-expanded` and `ui-disclosure-change` update immediately. Native `open` may remain true only for outgoing height; direct content is inert while closing. Completion restores natural styles/final native state. Object Ownership consumes logical intent, keeps its lazy body through exit and uses `refreshDisclosure()` after Vue mounting to remeasure the latest target without redispatching intent. Nested sections retain independent owners; already-owned elements are not assigned a second controller.

Native popup details are `details[data-ui-motion-popover]`. Latest `data-ui-popover-open`, summary aria and `ui-popover-change` update immediately. Closing direct surfaces become inert/pointer-blocked/aria-hidden while summary remains available to reverse the desired target. Native open/layer removal waits only for finite exit. Existing external native close, outside pointer/focus and Escape converge on this owner without queuing obsolete exits. Escape restores the trigger; outside-focus close preserves the new focused target.

Feature-detected `showPopover()`/`hidePopover()` gives direct surfaces a manual top layer without Teleport, DOM reparenting or model changes. Placement follows the trigger directly, clamps/flips within the viewport and bounds long content with scrolling; older engines retain an explicit clipped-region inline fallback. `data-ui-popover-layer` and actual `:popover-open` identify the route. Native-layer text inherits live theme color; explicit author color expressions/priorities and original styles are preserved/restored. ResizeObserver watches summary/surface size only while logically open; async sizing, viewport resize and scrolling reposition directly. Close/cancel/removal/disposal disconnects observation. Real fallback-host rendering still needs its own evidence.

Existing hierarchy/object reparenting, asset insertion, scene/bottom tab ordering and panel docking retain their existing commit/undo/data owners. The platform drag image follows the native pointer. Sources and existing valid/invalid targets provide feedback; a non-interactive release/cancel ring can settle at the captured destination or source rectangle after the logical action. FLIP affects mounted neighbors after a commit, not pointer hit testing. Resource-field drops, free-floating movement and clip-drag routes that were not implemented are not represented as new features.

## Policy, material and lifecycle

Normal motion is enabled by default. `getUiMotionPolicy()` returns:

- `on`: normal interaction feedback and eligible transient decoration.
- `light`: a constrained decorative budget, including low-end or explicit decorative-motion off, keeps interaction feedback and reduces presence displacement/scale amplitude to 0.6 of normal. Expensive material decoration is reduced.
- `reduced`: persisted user Reduced Motion or the system preference settles current owned jobs to their latest completion immediately and skips subsequent WAAPI motion. Necessary focus, selection and validation states remain visible.

Decorative budget is not an accessibility Reduced Motion signal. Persistent panels remain crisp; transient blur has an opaque fallback. No text motion blur, authored game-animation cancellation or geometry rollback is introduced.

`cancelMotion()` captures current presentation before cancelling. Presence uses that captured state on reentry; obsolete finish/cancel callbacks cannot affect a successor. Component owners use generations, restore their original inert/pointer/accessibility state, and clear completed, cancelled and unmounted jobs. Modal exit locks keep the scrim covering the viewport, reject repeated closing input and deactivate its inner controls until removal; existing modal-focus ownership remains responsible for keyboard focus.

The controller removes registrations for genuinely disconnected nodes, preserves connected reparented nodes, and disposes its event listeners, observers, pressed/range state, content/native-popup records and drag feedback. Top-layer/style snapshots restore on removal. There is no spring RAF loop at idle. Missing or rejected Web Animations support completes safely. Precise resize, KeepAlive deactivation and project/component exit cancel relevant presentation work.

## Evidence and limits

The protected current26.36 baseline is archived in `reports/comfortable/26.37/baseline`, digest `d4d78307f673398e2437441e7af64e23e95e00b6439851e919b786d981ebb465`. Five screens and nine timing/four raw counter windows use the same unchanged populated Player project,1600x900,UIscale1,DPR1. Shared-only representative1 exposed legacy Inspector clipping; source repairs and main-panel migration are implemented, with fresh current rendering acceptance separate.

Current46/46 deterministic production motion/controller host checks and Vue/TypeScript check passed; `reports/comfortable/26.37/implementation/observed-navigation-and-tilemap-fix.json` records actual source/test SHA and scope. The real module executes against controlled WAAPI/DOMMatrix/DOM/event/observer boundaries. Coverage includes bounded springs/variable time steps, current-state reversal/latest ownership, cancellation/disposal, live user/system/light policy, unsupported APIs, content focus/external close/lazy refresh, connected reparenting/removal, native values/game exclusions, modal/block-size interruption and native-layer placement/reversal/direct resize-scroll/fallback/style restoration. Added cases cover live inherited color, logically-open-only size observer cleanup and outside-focus closing. Old28-test cache receipts apply to their recorded source only.

Host checks do not establish compositor or real pointer/platform-event behavior. An earlier development GUI revision passed22/22 groups, actual drag/reorder/dock/cancel, minimum layout, Reduced Motion and history/save/reopen. Five strict captures and nine/four raw observations are in `release-audits/v26.37-comfortable-user.json` and `release-audits/v26.37-comfortable-performance.json`; later source changes require fresh execution. Current actual native-disclosures development execution passed9/9: eight1600x900 lifecycle groups plus all12 native menus at1024x640/DPR1/UIscale1, with real viewport/rounded-valid midpoint/every enabled-control hit and normal dock size. `release-audits/v26.37-native-disclosures-user.json` records that source-specific result; no private app state was injected or registry pass inferred. Failed attempts1–4 remain diagnosis. Remaining full-route acceptance is still separate. The actual fourteen source-bound gates and independent exact-eleven-file package verification establish final acceptance; development receipts cannot establish freeze or publication.

Latest rebuilt native9 also measured all12 popup corner radii>=16 and content inset>=20 (observed20), alongside actual minimum-window hit/reachability. The partial `v26.37-ui-rebuild-layout-remainder.json` receipt passed the last four groups over34 routes/41 captures with zero console exceptions; it does not replace the full ten-group layout gate. Frozen-source executed evidence remains authoritative.

Headless software Edge timing/layout/style/idle observations do not certify physical display latency, hardware GPU/raster/blur cost, native drag-image pixels, multiple displays/DPI, touch/pen or assistive technology. Native installer execution, signing and clean-machine installation require their own evidence. Historical 26.35 results apply only to that release.


Current linked follow-up: opacity-preserving finite workspace handoff passed all15 actual frame traces with zero blank samples and six navigation/state groups. Real TileMap fieldset/section geometry now uses20px field gaps,28px groups and20px four-way inset; its original populated conditional group and geometry assertion passed. Hover-only selected-value hints now clear removed/inactive ownership, and four actual keyboard/project-removal/latest-reentry groups passed. These development receipts are explicitly unqualified; the complete frozen-source fourteen gates and eleven-file delivery remain the release authority. Granular edits, source hashes and intermediate failed-candidate context: reports/comfortable/26.37/implementation/observed-navigation-and-tilemap-fix.json.
