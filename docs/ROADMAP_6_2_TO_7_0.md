# Nova_A 6.2.0–7.0.0 coding manual

This is the implementation contract for the 6.2–7.0 cycle. The complete current feature inventory is in `FEATURE_INVENTORY_6_2.md`.

## Product boundary and compatibility

Nova_A remains a lightweight, local-first 2D game engine/editor. 3D, XR, ray tracing, console SDKs, and AAA film/world systems are intentionally excluded through 7.0.0. Project Format 2/schema 29, Rhai API 2, Visual Graph 1, Plugin API 2, Package Manifest 1, Build CLI 1, and Workspace document 3 stay compatible through 6.x. New fields must be optional and deterministic. Old projects must open without destructive migration. Rhai and Visual Graph remain synchronized views of one behavior.

## Comparison-led priorities

Godot has mature optional static GDScript typing, C#, GDExtension, editor scripts/plugins, live editing, remote inspection, multiple play instances, broad exports, and a large node/resource ecosystem. GameMaker has a shorter sprite→object→event→room path, mature GML Code/Visual parity, reusable prefabs, and flexible saved workspaces. Unity has compiled C#, custom Visual Scripting nodes, extensive packages/platforms, and mature 2D pipelines. Unreal has typed Blueprint classes, C++ extensions, editor utility Blueprints, deep plugins, and large production systems.

Nova_A is already strong in focused 2D workflows, deterministic/safe physics evidence, local-first operation, graph↔Rhai synchronization, recovery, and explicit export/release diagnostics. It remains weaker in language depth, statement debugging, safe editor automation, reusable resource/interchange pipelines, platform breadth, native accessibility, compound/concave solver fidelity, multi-instance networking tests, ecosystem scale, and clean-machine shipping evidence. Releases below close those gaps without copying 3D-first weight.

Official references: [Godot features](https://docs.godotengine.org/en/stable/about/list_of_features.html), [Godot typed GDScript](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html), [Godot editor plugins](https://docs.godotengine.org/en/stable/tutorials/plugins/editor/making_plugins.html), [GameMaker GML](https://manual.gamemaker.io/lts/en/GameMaker_Language.htm), [GameMaker GML Visual](https://manual.gamemaker.io/monthly/en/Drag_And_Drop/Drag_And_Drop_Overview/DnD_Overview.htm), [GameMaker workspaces](https://manual.gamemaker.io/monthly/en/Introduction/Workspaces.htm), [Unity scripting](https://docs.unity3d.com/6000.0/Documentation/Manual/scripting.html), [Unity Visual Scripting](https://docs.unity3d.com/Packages/com.unity.visualscripting@1.9/manual/index.html), [Unreal Blueprints](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-blueprints-visual-scripting-in-unreal-engine), and [Unreal editor scripting](https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-blueprints).

## UI and release rules for every version

- Stable frame: Project/Hierarchy left, contextual canvas center, selection Inspector right, collapsible context tools bottom. Manage contains policy, not every editing feature.
- One obvious primary action per workspace; command-palette/shortcut/manual access; useful empty states; undo/recovery; retained panel state.
- No overlap/clipping at 1024×640 through 4K, 100–200% UI scaling, English/German/Chinese, light/dark/default/high contrast, reduced motion, long German labels, Chinese IME, and RTL test content.
- Performance work may lazy-load, cache, virtualize, batch, coalesce, or move safe jobs to workers. It may not delete a feature/animation or change fixed-step gameplay semantics.
- Every error names the asset/object, reason, recovery action, and Manual target. Native browser confirm/alert/prompt is forbidden.
- Every release produces exactly eleven root artifacts: portable EXE, MSI, setup EXE, Web ZIP, source ZIP, reference-project ZIP, evidence ZIP, RELEASE_NOTES, EDIT_LEDGER, LICENSE, and SHA256SUMS with ten non-circular hashes.

## 6.2.0 — behavior contracts and scripting reliability

Implementation:
- Add opt-in Rhai comment directives for strict/deterministic behavior, required component/input/asset/package dependencies, and commands/logs per callback. Scripts without directives retain old behavior and global limits.
- Reject malformed contracts and host-dependent API calls in deterministic contracts. Declared budgets may tighten but never raise frozen host limits.
- Validate requirements against attached objects, Input Map, Asset Database, and enabled packages before execution. Use the same diagnostics in play mode, Project Health, and Build.
- Add Script Studio Contract UI: flags, requirements, budgets, API module/thread/determinism/permission usage, diagnostics, and accessible header insertion. Add headers only to new templates.
- Preserve Visual Graph 1 and graph↔Rhai synchronization. Update EN/DE/ZH, teaching inventory, manuals, README, versions, reference behavior, and evidence.

Programmer audit: parser boundary/malformed/duplicate/quote tests; N and N+1 budget tests; requirement and deterministic-API tests; cache invalidation/hot reload; graph compilation; old-script compatibility; type/Rust/WASM/build/template/export/security/performance/layout/Windows/release gates.

Normal-user audit: old/new script creation; missing dependency diagnosis and repair without restart; graph and code edits both ways; keyboard navigation; all three locales and sizes; playable exported template.

## 6.3.0 — safe editor automation and deep plugin contributions

Implementation: versioned sandboxed editor automation using Rhai and Plugin API 2; read-only queries; selection; undoable scene/asset transactions; command/menu/panel/Inspector/gizmo/import/build contributions; dry-run diff; bounded work; cancellation/rollback; granular permissions; clean hot unload. Automation Studio shows templates, API, permission preview, trace, transaction diff, run/cancel, and package origin. Context actions appear in command palette and selection menus.

Programmer audit: denial matrix; rollback after exceptions; hostile fixtures; unload/leak/reload cycles; 1,000-command cap; deterministic diffs; headless runs; signature/lock/schema checks.

Normal-user audit: install reviewed sample offline; preview/run/undo batch edit; deny permissions; reload/disable/uninstall; recover intentional failure; no orphan UI in three languages.

## 6.4.0 — 2D content interoperability and animation production

Implementation: deterministic import/reimport for Aseprite metadata, TexturePacker, Tiled TMX/JSON/TSX, and common atlases; stable slicing/pivots/colliders/tags/references; 2D rig weight view, bounded auto-weights, constraints, onion skin, curves, retarget/root-motion preview; reusable Resource assets for materials, animation libraries, input maps, physics materials, themes, and data tables; dedicated contextual asset tabs.

Programmer audit: golden/malformed importer corpus; reimport identity; color/pivot/frame precision; resource cycles; deterministic serialization; retarget/playback tests; large atlas/timeline performance; export inclusion.

Normal-user audit: import/slice/animate; external edit/reimport/undo; moved-source repair; shared resource and one override; export in EN/DE/ZH without clipped controls.

## 6.5.0 — production physics and renderer fidelity

Implementation: per-child compound collision/mass/contact/sensor identities instead of convex envelopes; chain/edge and safely decomposed concave static solver shapes; dynamic concave stays blocked; rotational/compound CCD; warm starts/sleep islands; joint motors/limits/break forces; Rope2D collision policies; authoritative overlays; deeper shader/particle/light/pass/texture-streaming diagnostics and quality volumes.

Programmer audit: analytical force/impulse/energy; unit/scale invariance; manifold corpus; compound/chain/concave/CCD/joint/rope regression; 30/60/120 Hz determinism; NaN/fuzz limits; golden rendering; device loss/fallback; low-end budgets.

Normal-user audit: cross/hexagram bind/separate; string owner exclusion/other collision/breaks; resizing/moving; layer/mask isolation; grid units equal Inspector values; reference scenes show no seams.

## 6.6.0 — multiplayer production workflow

Implementation: reviewed optional transport adapters; authentication hooks; bounded/versioned serialization; encryption guidance; replay protection/rate limits; authority transfer/interest/scene handoff; editor multi-instance play; separate logs/Inspectors; ownership, replication diff, rollback timeline, network simulation and synchronized diagnostics; local lobby/relay interface with no mandatory cloud; co-op and headless references.

Programmer audit: malformed packets; denied permission; version mismatch; latency/loss/reorder/duplicate; rollback convergence; late join; disconnect cleanup; save/replay; 2/4/8-peer soak; exclusion when package is absent.

Normal-user audit: one-button host/clients; bad-network play; authority/bandwidth inspection; reconnect; client/server exports; revoked permission; unchanged offline play.

## 6.7.0 — device input, mobile delivery, and accessibility adapters

Implementation: touch/multi-touch/gestures/virtual controls/safe areas/orientation/DPI/haptics/sensors; gamepad remap/calibration/prompts via Input Map; qualified optional Android discovery/templates/manifest/permissions/icons/signing/deploy/logging; iOS remains matching-host/deferred; native Windows accessibility bridge where WebView/Tauri permit plus Web ARIA; semantic focus/live-state/value evidence; device previews and target/safe-area overlays.

Programmer audit: touch/pointer deduplication; gesture/replay/remap; least permissions; Android clean build when toolchain exists; semantic snapshots; keyboard/screen-reader; 200–400% text; contrast/motion/RTL/locales.

Normal-user audit: no-code touch game; gamepad remap; rotate previews; keyboard/screen-reader use; Android deploy or honest toolchain blocker.

## 6.8.0 — large-world and low-end performance

Implementation: measured data-oriented scheduling behind stable components; dirty transforms; spatial queries; safe worker animation/particles/navigation; batched commands; bounded reactive updates; frame-budgeted streaming; explicit main/worker/queue/cache/allocation/worst-frame metrics; editor virtualization and cancellable background work; Adaptive quality changes presentation budgets only.

Programmer audit: before/after equivalence and determinism; race/cancel/stale-result tests; leaks; 10k/50k/100k fixtures; input-to-pixel latency and 1% lows; cold/warm startup; worker fallback; low-end thresholds.

Normal-user audit: large scene/project search, draw/drag/select during background work, repeated workspace switches, low-end/adaptive play, all controls/animations retained.

## 6.9.0 — ecosystem, collaboration, and shipping

Implementation: registry publisher CLI; sandbox validation; compatibility/security/provenance metadata; solver diagnostics; trust/revocation/vulnerability flow; reproducible package archives; offline mirrors; opt-in signed updater architecture with rollback and no implicit network; change lists/ownership/semantic merge/conflict UI; signing hooks; matching-host pipelines; SBOM/provenance/patch/symbol/crash guidance; clean install/upgrade/repair/uninstall evidence.

Programmer audit: solver/malicious archive/path/signature corpus; revocation; updater rollback/replay protection; semantic merge round trip; clean-clone offline build; reproducibility; hashes/provenance; CI matrix.

Normal-user audit: package install/update/rollback; real scene/graph conflict; release candidate; size/security/licenses; clean-machine lifecycle; portable/Web run.

## 7.0.0 — stable creator platform

Implementation: freeze next contracts only after migration/ecosystem review; any schema change needs preview/backup/deterministic migration/rollback/diff/golden fixtures; audit every inventory item for binding, validation, undo, persistence, runtime/export, docs, and tests; consolidate contextual UI/naming/icons/keyboard/empty states/errors/typography/colors/motion/accessibility; publish complete EN/DE/ZH teaching manual with classification, prerequisites, steps, expected result, persistence, undo/recovery, mistakes, accessibility, code/graph equivalents, build, SDK, migration, troubleshooting, and guided projects; publish honest support/limitations/contracts/API/release evidence.

Programmer audit: all historical projects/templates/migrations/references; TS/Rust/WASM/unit/integration/fuzz/security; script/graph parity; renderer/physics/audio/network determinism; plugin lifecycle; native/Web exports; performance/stability/memory; docs/key/link parity; exact package/reproducibility/clean-machine/platform matrix. Severity 0/1 must be zero; external work remains external.

Normal-user audit: independent beginners finish guided projects from the manual and experts complete keyboard workflows. Exercise every inventory item across automated/manual paths under all locales/themes/scales/input modes, low-end hardware, recovery/plugin failure/bad input, and exported games. Record a real observation/soak period.

## Completion definition

For every version, record every edit, limitation, command, environment, result, and external gate. Required local gates: type check, Rust tests, WASM release, Vite production, manual/editor/script/render/animation/typography audits, templates/references, version verifier, interactions, EN/DE/ZH layout matrix, benchmark, stability smoke, dependency/security, deterministic export, Tauri build, native editor/game smoke where possible, evidence, eleven-file package, and checksum verification.

A release is incomplete if a control is unbound; save cannot reopen; graph/code diverge; runtime ignores a property; layers interact incorrectly; physics scale disagrees with the grid; translated text escapes; panels overlap/disappear; export depends on the developer workspace; fatal errors are swallowed; permissions are implied; an unrun test is reported passed; or an external gate is reported local.
