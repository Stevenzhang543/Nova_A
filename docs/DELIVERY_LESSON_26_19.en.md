# Nova_A 26.19: build, review and recover

Use disposable copies of the six projects under `reference-projects/projects` whose IDs contain `v2619`. Open `project.nova` from the launcher. The source package and reference archive include the files; no service account is needed. Project Format 2/schema 29, Rhai API 2, Graph Format 1, Plugin API 2 and Package Manifest 1 remain unchanged.

## Finish a small game in three authoring modes

Open `creator-v2619-code-game`, `creator-v2619-blocks-game`, or `creator-v2619-mixed-game`. Play, focus the viewport, and use WASD/arrows to collect six checkpoints. The title advances from Checkpoint 1/6 to completion. R resets score, position and checkpoints. Stop before editing.

In Code, open CheckpointGame.rhai and change the two movement multipliers from 6.0 to 4.0. In Blocks, open its linked CheckpointGame.nova-graph, find the numeric literals in the X/Y movement expressions, and change both to 4.0. Mixed keeps a linked code document and typed graph; switch views, confirm the same values, then save. Undo/Redo must change the intended edit only. Syntax errors must remain visible and must not silently replace code with an incomplete graph.

The pickup calculation queries the active Checkpoint entity's world position using `find_entity_handle`, `entity_position_x_on` and `entity_position_y_on`. Move Checkpoint 1 in Design and play again: its pickup location moves too. This is a deliberate improvement over the older fixed-coordinate lesson. Save/reopen and confirm the transform and script/graph values before exporting. The code and graph versions execute the same supported Rhai operations; generated graph arrangement does not change evaluation order.

## Review and resolve a real conflict

Open `delivery-v2619-semantic-merge/project.nova`. Select Checkpoint 1 and change Transform position X from -6 to -4. Open Manage → Build Settings → Team, enable Optional team workflow, and choose the neighboring `incoming.nova`. It changes the same entity's X to -2.

Read the local and incoming values; open Base version to see -6. Choose the incoming value for that conflict, then Apply semantic merge. The same entity now has X=-2. Undo returns to -4; Redo returns to -2. Save/reopen and export the result. Keep identity and entity count unchanged. The explicit ordering conflict chooses order while preserving merged property values. A delete/edit conflict can restore the edited identity; changing the choice again remains safe.

If you edit the project during review, applying the old preview is rejected. Reimport the incoming file and review the new preview. Unresolved conflicts block application. Duplicate identities and oversized/deep merge input are rejected before a partial plan is committed. These are local three-way project merges, not a cloud collaboration service. Enable network operations only for an explicitly requested external action; the merge itself needs none.

## Review a package and its lifetime

Open `delivery-v2619-package-build`, then Manage → Packages → Browse. Select Nova Navigation 2D. Read publisher, version, compatibility, dependencies, permissions, SHA-256 and license; choose Install and review the confirmation. The bundled offline catalog requires no download. Return to installed packages, disable, enable and remove the package. Undo removal, save/reopen and inspect the result.

A package that is still required by another package cannot be removed. Failed update permission approval restores previous grants. Rejected updates preserve the installed version and lockfile; quarantining a rejected newer candidate does not disable a valid older version. Rollback checks security and the complete dependency graph before consuming history. Disabling or removing a package unloads its running plugin. A version change unloads and disables the old binary until you import the corresponding reviewed manifest and binary; a version label is not evidence that code was replaced. Native plugins remain outside the in-process WASM sandbox. Remote plugin URLs are not fetched implicitly: import the asset locally first.

## Build and inspect the result

Open Manage → Build Settings. Overview selects target, architecture, profile, scene order and startup scene. Platform holds application identity and optional signing settings. Delivery exposes deterministic output, cache, inclusion rules, logs and reports. Diagnostics & history preserves build failures and output information. Team contains local collaboration controls.

Choose Web in a browser. Native export requires a successful desktop-host capability check, not merely a Windows browser. A failed check shows a restart/retry message. Android requires its actual local toolchain and a device for device qualification. Linux/macOS remain matching-host targets; Windows results do not qualify them.

Save before building and wait until the save task finishes. Export Web, extract the ZIP into a separate folder, serve it over local HTTP, and open its index page. Compare checkpoint positions, movement speed, score, restart and assets with the saved editor project. The archive's build report lists file sizes/hashes; validate them when transferring an artifact. The retained `server-v2619-headless-authority` is a renderer-disabled WebView server, not a windowless native server.

## Reproduce a source build offline

Install prerequisites intentionally first: Node 22.22.2 (`.node-version`), pnpm 10.30.0 (`packageManager`), Rust 1.92.0 (`rust-toolchain.toml`), clippy, rustfmt, wasm32-unknown-unknown, wasm-pack and its cached bindgen tooling. Windows native builds also require the matching MSVC/Windows SDK and Tauri bundling prerequisites. Use the checked-in lockfiles. No direct application dependency range was changed merely to pin a calendar release.

With populated dependency caches, run `pnpm install --offline --frozen-lockfile --ignore-scripts`, then `wasm-pack build crates/nova_wasm --target web --out-dir ../../nova_core/pkg --out-name nova_core --release --mode no-install -- --locked --offline`, then `pnpm build`. Missing cached dependencies should fail explicitly; offline does not mean prerequisites are magically available.

Windows pnpm junctions can retain an old absolute directory after moving a checkout. From the new path, explicitly repair them with `pnpm install --offline --frozen-lockfile --ignore-scripts --force`, then rebuild. Do not copy generated dependencies into the published source archive. The dedicated reproducibility audit compares clean and moved Web output byte for byte and keeps command logs; it does not claim that an arbitrary machine without prerequisites can build offline.

## External editing and recovery

For a standard LSP client, launch `node scripts/nova-rhai-language-server.mjs --stdio` from the source checkout with installed dependencies. It uses Content-Length JSON-RPC, UTF-16 positions and full document synchronization. The server supports diagnostics, completion, hover, symbols, definitions, references, rename and formatting for its declared Rhai model. Send increasing document versions; stale changes are ignored. Closing a document removes its index, and shutdown waits for queued work. An optional index is a cache, not the authoritative script file.

When a project file changes externally, compare it before choosing disk or editor state. A stopped/replaced watcher cannot publish a stale read into another project. Partially written invalid files retain a diagnostic and are retried. Keep the editor version if the disk file is incomplete; repair the external file and compare again. Test save/recovery on a disposable copy before relying on a workflow.

Signed update staging requires explicit opt-in, the matching channel, a valid signature/fingerprint, a supported base version and a fresh sequence. Cancellation or a changed base/channel during verification prevents staging. Staging does not download or install anything. Commit/rollback records describe operator-confirmed installer actions, not an atomic binary updater. Production signing and install/open/update/uninstall on disposable machines remain separately qualified; this user's available Windows computer is not treated as disposable. An iPhone does not qualify Android.

## Acceptance and evidence

Programmer evidence includes malformed/archive input, lifecycle cancellation, permission revocation, semantic identity/order, real LSP process messages, clean/moved offline builds, source hashes and full release gates. User evidence includes actual input, conflict choices, Undo/Redo, save/reopen, package review and exported player behavior. Changed panels are checked across EN/DE/ZH, light/dark, 100/150/200% and narrow/normal/wide layouts. Native UI automation initialization failed locally; browser observations are not relabeled as native clicks. Refer to the exact release evidence for completed checks and explicit external gaps; this lesson alone certifies none.

Attached plugin manifests imported with a package must match its ID, version and API. Imported consent is cleared and the plugin remains disabled. Review its capabilities in Plugin Tools before enabling; replacing the declaration unloads the previous instance.

Tauri’s generated native permission metadata also contains absolute cache paths. After moving a checkout, use a fresh native target directory: `cargo check --manifest-path src-tauri/Cargo.toml --target-dir src-tauri/target/relocated --locked --offline`. For a packaged build, set `CARGO_TARGET_DIR` to a new directory before `pnpm tauri build`; its output is written there. Preserve authored files and the old cache until the new build succeeds. The reproducibility audit uses four compiler jobs and records the explicit cache repair.
