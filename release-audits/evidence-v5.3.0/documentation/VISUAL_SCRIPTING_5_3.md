# Production visual scripting — Nova_A 5.3

Nova_A 5.3 keeps `.nova-graph` format version 1 and Rhai API v2. The graph is the editable source of truth; generated Rhai is an inspectable execution representation, not a second runtime.

## Build reusable logic

Open **Script → Visual Graph**, then use the **Structure** tab in Graph details.

1. Add a **Function** for reusable callable logic. Inputs and outputs become typed call-node pins. Enable **Pure** only when the function has no queued side effects.
2. Add a **Macro** for a reusable authoring block. Nova_A records its macro/inline intent while compiling it deterministically through the same callable graph contract.
3. Add a **Subgraph** to separate a large behavior into a named scope without changing its sandbox permissions.
4. Select a scope from the top scope picker. Each routine has its own nodes, wires, comments, viewport, inputs, outputs and local variables.
5. Add locals from the active routine card, then use **Get Local** or **Set Local** nodes. Locals exist only during that routine call.

Changing a signature synchronizes Entry, Return and call-node pins by stable key. Incompatible wires are removed rather than silently coerced. A public-signature change is saved, but active hot reload reports that a restart is required.

## Events, interfaces and libraries

- Add a custom event and typed parameters under **Structure**. The palette then exposes receiver and caller nodes.
- Add an interface and methods to define a typed graph contract. A routine can choose an interface; its name and input/output types must match one method or validation fails before play/build.
- Install and enable a project package that declares `visualNodes` in Package Manifest 1. Add it under **Graph libraries**. Only callables present in Rhai API v2 with an exact declared argument count become palette nodes. Disabled, missing or incompatible packages fail closed.

## Refactor without losing identity

The **Refactor** tab operates on stable UUIDs, not displayed order.

- **Rename** updates the selected symbol while retaining its UUID and records the previous name as a migration.
- **Find references** lists call, event, variable, local, interface and library consumers by graph scope.
- **Extract function** moves a valid main-graph selection into a new routine and reconnects one execution entrance/exit plus compatible data boundaries.
- **Replace node** preserves matching pins and wires, then drops only incompatible connections.
- **Migrate deprecated nodes** applies package/catalog replacement declarations and records each migration.

## Generated Rhai

The **Generated Rhai** tab shows the exact deterministic source sent to the shared script validator/runtime, including graph/source mappings and internal trace calls. **Generate new Rhai asset** creates a separate `.rhai` file under `Assets/Scripts/Generated`. It never overwrites the `.nova-graph`; later Rhai edits do not round-trip into the graph.

## Hot reload

Saving a running graph validates and classifies the candidate before a frame-boundary swap. Values are preserved only when stable variable UUID, type and serialized lifetime remain compatible. Removed serialized values, type/lifetime changes and routine-signature changes explicitly require a restart. The previous compiled program remains active after rejection.

## Limits and compatibility

Graph documents retain bounded node, edge, routine, interface, event, library, watch and breakpoint collections. Parsing is fail-closed and canonical serialization remains locale-independent. Existing 5.2 graphs load with empty production collections and serialize canonically without migration to a new file format.

