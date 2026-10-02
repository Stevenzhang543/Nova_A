# Nova_A UI Visual + Motion V3 Implementation Plan — 26.35

The 26.34 editor is the functional baseline. Preserve its information architecture, cached workspaces, native controls, Project Format 2/schema 29 and history contracts. The motion appendix is already merged into AGENTS.md. No new dependency or renderer rewrite is introduced.

## Investigation and consequences

Vue 3.5/TypeScript uses src/ui/editor.css, tokens.css, forms.css and motion.css. Actual Edge/WebView capabilities include Web Animations, PointerEvent, ResizeObserver and backdrop-filter; unsupported animation completes synchronously and unsupported blur stays opaque. The standalone player's separate main.css is unchanged.

The baseline had 3 px controls, square docks, 6 px dialogs, 24 px tree rows and 28 px commands. Fields were bounded and navigation stable, but launcher composition and group spacing felt rigid. V3 evolves central radii and semantic insets while retaining compact row/control/numeric/slider and domain canvas geometry. Enlarging every row would invalidate virtualization, so row heights are preserved.

All logical input/focus/state commits immediately. Springs act on presentation or after a committed drop. Closing overlays become inert immediately and retain partial entrance presentation when reversing. Effective reduced motion settles active jobs and disables decorative CSS; no continuous decorative timer runs. Native dragging owns its pointer image. Docks stay connected, opaque and crisp. Blur is selective and has an opaque fallback.

## Completed implementation and acceptance contract

| Phase | Result | Acceptance authority / limits |
|---|---|---|
| 0 Baseline | Captured before edits | Exact 3274-file digest a18116a63bfbb4ff8404563a55ffca4d5ef38039b046659e3dd81d345e3a24c0; fresh WASM/TypeScript/Vite and Rust workspace tests passed. Actual baseline has nine input timings, four renderer windows and five comparison screenshots. Calibration failures are explicitly retained separately. |
| 1 Visual audit | Directly linked defects fixed | Cramped group/header geometry, weak launcher composition, whole-label wrapping, recents hint crowding, dialog horizontal containment, semantic primary-hover contrast, wrong hierarchy resize edge, selection-induced breadcrumb drag cancellation, and unreadable narrow hierarchy names/actions at 200% text. |
| 2 Tokens | Implemented | Shared 4/6/9/12/16 px radii, semantic spacing/materials/elevation; compact rows and controls retained. Four motion duration families and three real spring presets. |
| 3 Components | Implemented | Shared native states/fields, dialog/menu/palette presence, property-section reveal, inert measured tab indicator. Empty/invalid tab selection hides its indicator. Native inspector details, tooltips and notifications remain immediate. |
| 4 Launcher | Implemented and visually checked | Nova SVG mark/node motif; existing project actions, recents and templates retained; finite entrance and no idle decoration. Twelve direct translated/scaled/theme/minimum-window cases and thirteen individually inspected captures. |
| 5 Persistent shell | Preserved | Connected docks, toolbar/hierarchy/inspector/bottom shell; cached workspace content has no full-shell fade or remount. Final actual navigation and all-panel geometry gates remain required. |
| 6 Motion | Implemented | Sampled damped springs via finite WAAPI; retargeting, one supervising leave completion, lifecycle disposal and immediate reduced/unsupported fallback. Focused production-module checks cover these invariants. |
| 7 Drag | Supported owners integrated | Hierarchy reparent/reorder/cycle/lock validation; assets/folders confirmation/GUID/history; bottom tabs and panel dock/floating feedback. Direct viewport/tile/graph/keyframe/waveform/resize math retained. Actual native drag/cancel/history/save tests gate qualification. |
| 8 Blur | Bounded material | Only transient menu/palette, 10 px at 96% surface opacity; low-end/high-contrast/reduced/off/unsupported fallback. Actual blur-on renderer windows and functional blur-off fallback assertions are retained; no paired quantitative blur-cost or hardware GPU certification. |
| 9 Specialized tools | Shared system applied | Animation, TileMap/TileSet, physics, game UI, input, profiler/debugger and settings inherit shared fields/state/materials. Their functional spatial exceptions stay in the owning domain. Final populated route captures verify containment. |
| 10 Performance | Measured host scope | Same named baseline/refined event-to-observed-frame and renderer task/layout/style/rAF windows, plus after-only native drag/scroll/resize semantics and representative 110-entity/100-plus-asset authoring. No quantitative baseline drag-latency, physical scan-out, device CPU/GPU or long-soak claim. |
| 11 Accessibility | Integrated | Immediate keyboard focus, manual tab activation, native field semantics, system/user/effective-profile reduction, visible non-motion feedback and opaque contrast fallback. Physical assistive technology remains external. |
| 12 Final consistency/delivery | Required immutable qualification | Fresh native/Rust/WASM/Web/TypeScript, focused/current-browser tests, all-panel/navigation, authoring/input/export/game, Windows/headless smoke, hygiene/manual and performance; final reviewed source snapshot and eleven files in releases/v26.35. |

## Explicit deferred scopes

- General resource-field drop assignment, arbitrary free-position floating-window movement and animation clip dragging are currently absent. Retain their existing picker/fixed-dock/direct-edit workflows.
- Keyframe neighbor animation requires stable key identity; existing changing indices are unsafe for FLIP. Direct time editing and cancellation remain precise.
- Physical native drag-image appearance, device GPU blur cost, real low-end performance, multiple displays/DPI/touch/pen/assistive technology, clean-machine installation/signing and prolonged human comfort need the corresponding host/observation.

## Verification and edit accounting

Development evidence is reports/phase3/26.35/baseline, controls, visual, drag-regression and hierarchy. It is explicitly distinct from release qualification. The corrected narrow hierarchy passed seven actual checks with six individually reviewed captures, including 200% minimum-window readability and public read-only recovery. Earlier failed diagnosis captures retain their original scope. Every authored changed/added path and consequence is in docs/EDIT_LEDGER_26_35.md and reports/phase3/26.35/EDIT_MANIFEST.json. Earlier user changes are preserved. Browser tests use visible controls/real input and read diagnostics, without private production-state injection.

The fourteen risk-linked release gates and seven explicit omissions are defined in scripts/prepare-release-26.35.mjs. Unchanged template/security/long-duration/duplicate geometry and lint scopes are not repeatedly swept or silently marked passed. Final successful execution is authoritative in releases/v26.35/Nova_A-v26.35-release-evidence.zip; checklist prose cannot replace it.
