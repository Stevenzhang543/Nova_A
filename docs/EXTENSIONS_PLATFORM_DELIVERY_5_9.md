# Nova_A 5.9 extension ecosystem and platform delivery

Nova_A 5.9 keeps Project Format 2/schema 29, Rhai API 2, Graph Format 1, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 compatible. Every extension is optional and local-first. Opening a project never downloads a package, starts a native process, contacts a deployment endpoint or grants a permission.

## Ecosystem Studio

Open the bottom dock and choose **Ecosystem Studio**. Its tabs separate five tasks so extension controls do not accumulate in the object Inspector:

1. **Extensions** shows the complete Plugin API matrix, registered manifests, lifecycle counters, Safe Mode, contributions and Native ABI 1 rules.
2. **Package Lab** creates Package Manifest 1 metadata, produces a canonical signing request, verifies an Ed25519 publisher signature, runs certification and imports/exports bounded offline registries.
3. **Export templates** shows pinned player templates and every target's current qualification gates.
4. **Delivery** shows the CI matrix, deterministic cache keys, delta-build policy and explicit deployment connectors.
5. **Audit** distinguishes locally passed checks from clean-machine, signing and matching-host evidence that still has to be captured externally.

## Plugin API 2 contribution matrix

Each declarative contribution requires the matching permission. A WASM module receives no filesystem, process or raw-network import. Calls have an 8 ms host bound and 16 MB memory bound; a failing module is removed without taking down other extensions.

| Contribution | Permission | Host export |
| --- | --- | --- |
| Dock | `editor.docks` | `nova_plugin_panel` |
| Inspector | `editor.inspectors` | `nova_plugin_inspector` |
| Importer | `editor.importers` | `nova_plugin_importer` |
| Component | `editor.components` | `nova_plugin_component` |
| Graph node | `editor.graph-nodes` | `nova_plugin_graph_node` |
| Render pass | `render.passes` | `nova_plugin_render_pass` |
| Build step | `build.steps` | `nova_plugin_build_step` |
| Project template | `project.templates` | `nova_plugin_template` |
| Command | `editor.commands` | `nova_plugin_command` |
| Settings page | `editor.settings` | `nova_plugin_settings` |

Graph-node contributions must name an existing Rhai API 2 callable in their `entry` field. Nova_A derives typed pins from that stable callable rather than trusting plugin-supplied executable source. Reload creates a new generation; unload calls the optional shutdown export and cancels stale asynchronous load results.

## Native Extension ABI 1

Native code never installs through the in-process package browser. A native manifest must declare:

- ABI `1`, entry symbol `nova_extension_v1` and `sidecar-process` isolation;
- one SHA-256-pinned binary for each supported operating system/architecture pair;
- only reviewed project, asset, network, process or render-pass permissions;
- a 100–30,000 ms heartbeat and zero-to-five restart limit.

Nova_A creates a launch plan only after every requested permission is granted. The plan has `implicitExecution: false`; an external, user-confirmed sidecar host is still required. The editor never loads arbitrary native code into its own process.

## Publishing a package

1. In **Package Lab**, enter a reverse-domain ID, semantic version, publisher, archive SHA-256, license, HTTPS documentation/security URLs and the smallest permission set.
2. Create the signing request. This canonical JSON contains the manifest and archive hash but no private material.
3. Sign the file with an Ed25519 key outside Nova_A. Paste only the public key and Base64 signature into Package Lab.
4. Choose **Verify and trust for this session**. Trust is fail-closed and scoped to the exact ID, version, archive hash, publisher and signature.
5. Run certification. Invalid fields, unknown permissions, unsafe paths, more than 50,000 files, archives above 512 MB, expansion bombs and hidden executables are blocked.
6. Export a local registry for offline use. Registry import validates at most 5,000 manifests and never downloads or executes package content.

Private keys are never requested, persisted or included in diagnostics. Stable installation still requires compatible dependencies and locked dependency hashes.

## Export templates and platform truth

Windows x64 game/headless and Web ES2022 templates are bundled and pinned. Linux and macOS templates remain matching-host CI candidates. Nova_A on Windows cannot honestly qualify their graphics, input, audio, packaging, signing or lifecycle, so those gates remain **Pending external**. Windows also keeps independent clean-machine install/launch/upgrade/repair/uninstall and publisher signing pending.

Android stays **Blocked** until JDK, SDK, NDK, template, signing, connected device, install/launch, input and audio/lifecycle gates all pass. Merely entering an SDK path never promotes the platform.

Offline template import derives trust from the Whitelist official signature; a manifest cannot make itself trusted by setting a Boolean.

## CI, cache, delta and deployment

CI Matrix 1 contains required Windows/Web jobs plus optional matching-host Linux/macOS and blocked Android jobs. Cache keys use canonically ordered inputs so property order cannot alter the key. Delta Build 1 records sorted added, changed and removed paths relative to a named base build; it does not replace the full signed artifact.

Deployment connectors are one of local folder, HTTPS webhook or external command. Remote/external connectors need a project permission and an explicit final confirmation. **Prepare plan** validates the target and checksum but returns `executableAction: false` and `implicitNetworkOperation: false`. Nova_A never sends the request or runs the command automatically.

## Verification and honest limits

Run:

```text
pnpm references:v5.9.0
pnpm check
pnpm test:core
pnpm build
pnpm verify:v5.9.0
pnpm qualify:v5.9.0:layout
pnpm audit:v5.9.0
pnpm evidence:v5.9.0
pnpm tauri build
pnpm release:v5.9.0
```

The automated verifier covers the API matrix, two-generation WASM initialization, Native ABI permissions, malicious package corpus, offline registry, platform gates, deterministic cache/delta behavior and network-transparent deployment plans. Publisher signing, independent clean-machine lifecycle, Linux/macOS matching-host builds, Android device qualification and real wall-clock soak remain external evidence and are not claimed by a Windows run.

## No implicit execution

No implicit execution and no implicit network operation are release invariants. Loading a project, opening Ecosystem Studio, importing a registry or configuring a connector is inspection/authoring only.
