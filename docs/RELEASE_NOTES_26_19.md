# Nova_A 26.19 release notes

Engine **26.19.0**, Project Format **2**, public schema **29**. Rhai API 2, Graph Format 1, Plugin API 2, Package Manifest 1 and Network Protocol 2 remain unchanged. This milestone preserves earlier releases and all 40 library starters.

## Delivery and recovery

Windows/Web builds use Node 22.22.2, pnpm 10.30.0 and Rust 1.92.0 with checked-in dependency locks. Native readiness requires a successful desktop capability check; a Windows browser cannot claim native export availability. Blocked idle builds no longer display Ready to build. Exact host diagnostics and existing repair/log routes remain visible.

The offline audit copies authored source, installs from the populated local cache, builds optimized WASM/Web, checks native compilation, moves the checkout into a path with spaces, explicitly repairs pnpm junctions offline, and rebuilds. It compares Web output bytes and checks unchanged authored source. Offline builds require intentionally installed prerequisites and populated caches. PE installers are built and verified separately; no universal byte-identical signed-installer claim is made.

Package install, activation, update, rollback and removal validate complete candidate dependencies before committing state. Failed updates restore permission grants. Invalid newer candidates cannot disable valid older installed versions merely by sharing an ID. Disabling/removing a package disposes its plugin; replacing its version unloads the old binary until the matching reviewed binary is imported. Revocation and project replacement cancel pending activation. Plugin assets must be imported locally; remote URLs are not fetched implicitly. Stable and preview installs cannot bypass complete trust/dependency checks through hidden unverified flags.

Signed update review rechecks opt-in, channel, base version and replay sequence after asynchronous verification. Cancelling or changing context prevents stale staging. Minimum base versions are enforced. Commit and rollback remain operator records; they do not download or atomically install binaries. Archive metadata rejects traversal, malformed paths, Windows device names, alternate streams and ambiguous aliases. Separate exported-archive checks verify actual bytes and hashes.

## Collaboration and external editing

Semantic merging preserves identities, one-sided reorders, concurrent insertion anchors and independent property edits. Conflicting order is explicitly reviewed. Delete/edit choices can restore an absent identity and can be changed repeatedly. Paths correctly escape tilde/slash; literal __proto__ keys remain data. Duplicate identities and oversized/deep input are rejected before a plan is committed. Applying a stale preview is blocked; a successful merge is one Undo/Redo transaction.

Local/incoming values appear side by side with the base available for comparison. Cards grow with their contents and stack when narrow. Package metadata, SHA-256, permission reviews and links wrap at large text sizes; asynchronous confirmations apply only to the reviewed item.

External file watchers bind reads and timers to their owning generation and retry incomplete writes. The actual stdio Rhai LSP server ignores stale document versions, bounds framing headers, rejects ambiguous lengths and serializes shutdown. It declares full document synchronization; this does not add incremental sync or full Rhai compiler equivalence.

## Teaching and verification

Six separate 26.19 references cover Code, Blocks, Mixed, a renderer-disabled authority, package/build review and a real collaboration conflict. New gameplay reads checkpoint world positions, so moving a checkpoint in Design moves its pickup location in the exported game. Linked graphs compile to the same source. Complete delivery lessons are integrated into the cumulative English, German and Chinese manuals.

See [English](DELIVERY_LESSON_26_19.en.md), [Deutsch](DELIVERY_LESSON_26_19.de.md), [中文](DELIVERY_LESSON_26_19.zh.md), [field/action inventory](DELIVERY_FIELD_MATRIX_26_19.md), [acceptance tracker](IMPLEMENTATION_TRACKER_26_19.md) and [every edit](EDIT_LEDGER_26_19.md).

The release plan requires all 21 common gates plus fresh delivery, LSP, save/recovery, clean/moved build and authoring bundles. User actions include conflict selection, Undo/Redo, save/reopen, exact Web export and player movement/pickup/restart; package review, enable/disable, remove/Undo and permission persistence; and browser readiness. The focused Team and package matrices cover 54 and 108 surfaces, respectively, in EN/DE/ZH, two themes, three text scales and three widths, alongside the common panel matrix. A 5000-identity merge is timed locally; it is not a universal frame-rate guarantee.

## Explicit qualification limits

Only this Windows computer is available. Matching Linux/macOS, Android toolchain/device, production signing and disposable install/open/update/uninstall remain pending. An iPhone 12 does not qualify Android. Native GUI automation could not initialize; browser clicks and native process/build checks remain distinct. A real external-editor GUI session and native file-picker watcher interaction remain unobserved; actual LSP messages and controlled watcher I/O are programmer evidence. Independent accessibility/security review, public infrastructure, mobile hardware and long-duration soak remain external. The retained headless authority uses a renderer-disabled WebView; it is not a windowless native server. No claim of zero defects or engine parity is made.

Packaging requires exactly 11 files under releases/v26.19, with independent source, artifact, evidence and checksum verification. This document describes the candidate; only executed frozen-source gate reports and package verification establish completion.

Attached plugin imports validate ID/version/API before package mutation, clear all imported grants and remain disabled for explicit review; replacing an attached manifest disposes the old instance. This closes the same consent boundary already enforced by the dedicated plugin importer.

Official package trust binds normalized operational metadata, including permissions, dependencies and visual declarations; legacy description and vulnerability-policy prose may differ. Publisher-signed verification binds the complete normalized manifest.

The desktop crate declares its own workspace boundary, so a source checkout nested under another Rust workspace still builds with its separate lockfile.

Moved builds explicitly repair pnpm links and rebuild native Tauri permission metadata in a fresh target directory because both caches can contain old absolute paths. The audit records four compiler jobs and never silently deletes authored files or old caches.

Official references retain compatibility with legacy description and vulnerability-policy wording; execution-relevant metadata remains trust-bound. A current-reference load regression covers this boundary.
