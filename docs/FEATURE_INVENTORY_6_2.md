# Nova_A feature inventory at 6.2.0

This inventory was reconstructed from all editor, runtime, Rust/WASM, project, asset, build, manual, verification, and release source. Nova_A 6.2.0 exposes 323 teachable public operations: 311 system operations and 12 guided projects.

1. **Project Manager (8):** create/open/add/import projects; migration preflight; rollback; recent projects; categorized templates.
2. **Workspaces (12):** Design, Script, Animation, Interface, Debug, Manage; dock/float; saved layouts; focus; navigation history; command palette; shortcut editor.
3. **Hierarchy and scenes (14):** search/filter; virtualized 10,000-object list; multi-select; rename; duplicate; group; reparent; reorder; lock; hide; isolate; breadcrumbs; scene tabs; additive/overlay scenes.
4. **Scene viewport (20):** select; move; rotate; scale; pivot; rectangle; polygon; path; collider; ruler; grid/pixel/vertex/edge/center/angle snapping; guides; align/distribute; mirror; camera frame.
5. **Inspector and components (16):** Transform2D; renderer, physics, gameplay, UI, audio, and Script2D components; multi-edit; expressions; search/changed-only/pins; reset/copy/paste; keyframes; validation; prefab overrides.
6. **Assets (18):** import; scripts/graphs/folders; grid/list; search/tags/favorites/collections; provenance; presets/platform overrides; reimport compare; reference repair; unused review; slicing; atlases; audio/font import; 50,000-item virtual window; trash.
7. **Physics (21):** rigid/character bodies; colliders/sensors; layers/masks; mass/density/inertia; force/impulse; friction/restitution/damping/sleep/CCD/one-way; queries; distance/revolute/prismatic/weld/spring joints; Rope2D; compound bind/separate; collision timeline/replay.
8. **Script Studio (18):** Rhai editor; diagnostics/actions; completion/API; definition/references; rename/format; lifecycle; exported properties; modules; behavior contracts; per-callback command/log budgets; transactional hot reload; break/logpoints; step/watch; tasks/signals; tests; coverage; headless CI; external-editor protocol.
9. **Visual Graph (16):** palette; typed pins/wires; branches/loops; functions/macros; subgraphs/interfaces/libraries; variables/exposed values; breakpoints/active wires; watches/call stack; timings/coverage; graph-to-Rhai; refactor/references; semantic diff/merge; hot reload; package nodes; 1,000-node profile. Rhai and graph are synchronized views of one behavior.
10. **Animation and timeline (15):** property/sprite/event/method/audio/nested tracks; state machines; parameters/transitions; blend trees; layers/masks; 2D rig/skinning; retarget; runtime record; timeline cameras/subtitles/branches/markers/skip/resume.
11. **Interface/localization/accessibility (18):** Canvas/RectTransform; panels/images/text; controls; anchors/constraints/layout/clipping/scroll; themes/variants/reusable UI; localization/fallback/pseudo/RTL/bidi/formatting; focus; screen-reader semantics; contrast/target/reduced-motion audits; prompts/captions.
12. **Audio (12):** clips/sources; waveform regions/loop/seek; buses/mixer/effects/limiter/sends/snapshots/automation/fades; spatial audio; playlists; preload/stream; voice budgets; recovery.
13. **World/navigation/AI (16):** TileMap palette/paint/terrain/animation/collision/occlusion; navigation regions/agents/obstacles/links/cost/path; behavior/HSM/perception/utility AI; chunks/dependencies/origin; pooling; background bake.
14. **Rendering (16):** Canvas2D/WebGL2; material graph; layers; 2D lights/shadows; render graph; textures/post/camera volumes; particles/trails; shader validation/fallback; color; batching/instancing/culling/overdraw/atlas; quality; pixel/high-DPI.
15. **Debug/performance (15):** play/pause/step; runtime Inspector; console; fault/crash/Safe Mode; profiler/timings/memory/lifetime/traces/comparisons; tests; replay/checksums/screenshots/headless; Physics Monitor.
16. **Manage/project policy (14):** theme/language/UI scale/density/contrast/motion; autosave/confirmations; input/physics/audio/collision settings; validation/repair/recovery/migration; low-end profile; Studio Status.
17. **Packages/plugins (18):** registry/lock/dependencies/hashes/signatures/permissions/licenses/quarantine/rollback/offline cache; editor/runtime/build/importer/template contributions; load/reload; native ABI declaration; wizard; Ed25519 request; certificate scanner; offline registry; export templates; CI/cache/delta/deploy helpers.
18. **Networking (14):** explicit permission; lobby/direct; reliable/unreliable channels; RPC; authority/replication/interpolation/prediction/reconciliation/rollback/late join; latency/loss; replay/save; packet diagnostics; headless tests.
19. **Build/delivery (18):** targets/architectures; portable/player-pack/Web output; scene order; deterministic packaging; stripping/profiles/provenance/SBOM/patch/symbol/header; export templates; Build & Run; size/deploy/signing guidance; release pipeline.
20. **Recovery/team (12):** atomic saves/journals/autosave/checkpoints/recovery; external conflicts; trash; semantic diff; Git; ownership/CODEOWNERS; tasks/notes; presets; locks.
21. **Guided projects (12):** Snake; platformer; top-down; physics puzzle; localized menu; cutscene; TileMap world; save/checkpoint; package/plugin; network; Windows portable; Web deployment.

## Honest limitations

- No 3D, XR, ray tracing, console SDKs, or AAA film/world systems.
- Windows and Web are Tier-1; Linux/macOS need matching-host evidence; Android is optional; iOS is deferred.
- Chain/concave collision is query-only and multiple collider shapes use a convex-envelope shortcut before 6.5.0.
- Rhai is dynamic; debugging pauses at safe callback boundaries rather than every statement; the external-editor protocol is not a complete LSP.
- No managed matchmaking, relay, accounts, or anti-cheat. Native screen-reader adapters and hosted update services are not yet complete.
- Some AI, pooling, streaming, networking, and platform functionality is optional-package based by design.
