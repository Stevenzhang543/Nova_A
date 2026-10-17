# Nova_A 6.3 visual scripting, automation, and plugin safety

Nova_A 6.3 keeps Project Format 2/schema 29, Rhai API 2, Visual Graph 1, and Plugin API 2 compatible. It changes the editor workflow, not the exported behavior contract.

## One behavior, two automatic views

- Saving a new or existing `.rhai` asset ensures a linked `.nova-graph` companion. Lifecycle functions become event blocks, recognized API calls become typed blocks, simple exported variables become graph variables, and syntax without a standard visual equivalent remains editable in a bounded Code block.
- Saving a `.nova-graph` ensures a linked `.rhai` companion and regenerates its deterministic marker projection. Graph, node, and variable UUID comments are valid Rhai and support precise subsequent updates.
- The first manual-code save does not rewrite the user's source. After the companion exists, a visual save intentionally produces the canonical marked projection. An editor with an unsaved draft is never overwritten by an external synchronization event.
- Hot reload receives the saved code and graph assets. Independent behavior is not deleted; it is linked automatically when its owner is saved.

## Scratch-inspired Blocks view

Blocks is the default authoring style. The palette uses the familiar Motion, Looks, Sound, Events, Control, Sensing, Operators, Variables, My Blocks, and Extensions families. Event hats start stacks; sequential blocks auto-connect below the selected block; reporter and Boolean blocks use distinct silhouettes. Values remain editable inline.

Nodes remains available beside Blocks. It exposes every typed execution/data pin, manual wire, graph scope, function, macro, subgraph, interface, package node, semantic diff, refactoring tool, breakpoint, active wire, call stack, coverage result, and generated source view. Switching views does not change graph semantics or delete graph data.

The interaction model follows the official Scratch editor's category palette and scripts-area organization while retaining Nova_A's advanced graph tooling. Reference material: [Scratch editor tour](https://scratch.mit.edu/help/studio/tips/ui/tour-intro/), [Scratch variables, lists, operators, conditionals, and custom blocks](https://www.scratchfoundation.org/learn/learning-library/variables-lists), and [Scratch My Blocks](https://resources.scratch.mit.edu/www/guides/en/ScratchLearningResource_MyBlocks.pdf).

## Editor Automation 1

Open **Manage → Automation**. Choose a template or author `fn run()` with a permission header:

```rhai
// @nova-editor-automation selection.read selection.write scene.read scene.write
fn run() {
  let selected = editor_selected();
  if selected.len > 0 {
    editor_rename(selected[0], "Reviewed object");
    editor_select(selected[0]);
  }
}
```

1. Review only the permissions named in the header.
2. Select **Preview dry run**. Compilation and execution occur in the local Rhai WebAssembly sandbox; the project is not mutated.
3. Inspect every proposed before/after entry and the execution trace.
4. Select **Apply transaction**. Commands are revalidated against stable entity handles and applied as one history transaction.
5. Use **Undo last automation** or ordinary Undo to restore scene, selection, and asset data.

The host allows read-only selection/scene snapshots and explicit selection, rename, transform, enable, tag/group, delete, bounded shape creation, and bounded text-asset creation commands. Source is capped at 256 KiB, output at 1,000 commands, snapshots/queries at 256 entities per request, created source at 64 KiB, and execution at the host sandbox's operation/data/depth limits plus a 250 ms editor budget. Cancellation is observed before compilation, before preview publication, and between apply commands. An exception or cancellation during application reloads the transaction's complete pre-state.

Automation has no filesystem, process, network, environment, clock, randomness, native extension, build, deployment, or secret-store API. Unknown calls and undeclared, duplicate, unknown, or ungranted permissions fail closed.

## Plugin API 2 lifecycle

Importing a `.json` manifest plus `.wasm` binary does not initialize the plugin. Nova_A validates the manifest, semantic version, API, entry path, file size, WebAssembly magic, SHA-256/signature fields, allowed host imports, and required exports, stores the plugin disabled, and displays its requested permissions.

The user approves capabilities individually, then enables the plugin. Only approved contributions enter their owners:

- commands in Command Palette;
- menus, Inspectors, gizmos, and components in the selected-object Inspector;
- importers and asset editors in Assets → More;
- build hooks and steps in Build Settings and the explicit Build/Build & Run transaction;
- panels, docks, settings, render passes, runtime systems, templates, and events in Ecosystem Studio or their existing specialized hosts.

Disable, unload, uninstall, Safe Mode, initialization failure, call timeout, memory violation, or handler exception removes the plugin from the active ID set and removes its contributions immediately. Generation checks prevent a late reload from resurrecting an unloaded instance.

## Honest limits

Rhai-to-block conversion is structural, not an unrestricted compiler decompiler. Standard lifecycle/API statements and literal arguments become native blocks; complex custom algorithms remain lossless Code blocks. Cancellation cannot interrupt the middle of one synchronous WebAssembly call, so the Rhai engine's operation, expression-depth, call-depth, collection, string, and command limits remain the hard preemption boundary. Native plugins remain validation-only sidecar plans and are never started implicitly.

Publisher signing, independent clean-machine and hardware/accessibility certification, matching-host non-Windows builds, and a real-duration soak are external release gates until independently performed.
