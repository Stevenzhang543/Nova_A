# Nova_A 5.2 visual scripting guide

Nova_A visual scripts are executable, versioned assets. They are not diagrams layered over a hidden second runtime: every valid graph compiles into Rhai API v2 source and enters the same sandbox, callback, command-queue, permission and diagnostic path as a handwritten `.rhai` script.

## Create and attach a graph

1. Open **Script** and choose **Visual Graph**, or use **Assets → Visual Graph**.
2. Give the new `.nova-graph` asset a useful name. The default graph contains **Event Start → Log Info**, so it can run immediately.
3. Select a scene object, add or open its **Script2D** component, and select the visual-script asset. Rhai and visual scripts use the same attachment field.
4. Add exposed variables in the graph's **Variables** section. Their type, default, group, tooltip, numeric range and serialization choice appear in the object Inspector.
5. Resolve every red diagnostic before Play. Warnings do not block play; type, cycle, missing-pin and identity errors do.
6. Press **Play**. Lifecycle events execute in the same order and physical mutations enter the same validated queue as Rhai.

Changing the graph does not change Project Format 2/schema 29. The asset remains a normal project asset referenced by UUID.

## Graph Editor controls

| Control | Result |
| --- | --- |
| Palette/search | Filters the generated API catalog and core flow/value nodes; select a result to create it. |
| Space | Opens keyboard creation at the current canvas focus. |
| Drag empty canvas / mouse wheel | Pan / zoom the viewport. Viewport state is saved in the asset. |
| Drag a node header | Moves every selected node as one selection. |
| Drag output pin to compatible input pin | Creates a typed wire. An input accepts one incoming wire. |
| Drag empty canvas with Shift | Box-selects nodes. |
| Align / Distribute | Aligns or evenly distributes the current multi-selection. |
| Reroute | Creates a small execution or data routing node without changing behavior. |
| Comment | Creates a movable, resizable semantic region saved with the graph. |
| Collapse | Reduces a node or comment while retaining all connections and data. |
| Ctrl/Cmd+D | Duplicates the selected nodes and their internal wires with new UUIDs. |
| Ctrl/Cmd+Z, Ctrl/Cmd+Y | Undo / redo graph edits. |
| Delete | Removes selected nodes and every wire that refers to them. |
| Ctrl/Cmd+S | Canonically serializes and saves the asset. |
| Minimap / Frame | Navigate a large graph or fit its authored bounds. |

The editor culls distant nodes in large graphs, keeps wires above the grid and below node controls, and preserves reduced-motion and multilingual editor settings.

## Node families

- **Lifecycle and callbacks:** awake, start, fixed/update/late update, destroy, timer/task, signal, collision and trigger callbacks.
- **Input:** action held/pressed/released, scalar/vector actions, pointer position and wheel deltas, including compatible API-v1 aliases.
- **Flow:** branch, deterministic sequence, and bounded repeat. Repeat clamps to 0–1,024 iterations; arbitrary cycles are rejected.
- **Values and variables:** Boolean, Number, String, Vec2, Entity, Resource and serializable Data constants; graph variables can be read, written, exposed and serialized.
- **Math, comparison and logic:** finite arithmetic, minimum/maximum, equality/order, Boolean and/or/not, make/break Vec2. Divide and modulo by zero return `0.0`.
- **Conversions:** explicit Number/Boolean to String, Boolean to Number, and String to Number conversions. Incompatible pins never coerce silently.
- **Transform and physics:** snapshots, exact position/rotation/scale, forces, impulses, velocity, character movement and floor/wall state.
- **UI, audio and animation:** text/value changes, AudioSource playback, Animator parameters/triggers/state changes.
- **Scene and resources:** instantiate, destroy/despawn, load/reload/quit, typed handles and API introspection.
- **Save, signals and timing:** safe persistent data, targeted/broadcast signals, clocks, deterministic random, timers and deferred tasks.
- **Debug and tests:** bounded log levels and non-destructive `expect` assertions.

The catalog is generated from `SCRIPT_API_V2_MANIFEST`; a callable returning a value always has a data output, a queued mutation has execution input/output, and a lifecycle callback starts an execution path. This generation rule is audited so Rhai cannot gain a v2 callable without the graph editor seeing it.

## Pins and conversions

Execution pins define order and never carry values. Data pins are typed. `Data` is the explicit serialization boundary for null, arrays and maps; it can connect to another typed pin only where the graph deliberately accepts dynamic data. Entity and Resource pins store handles/references, not display names.

Use a conversion node when types differ. Nova_A rejects an execution-to-data wire, reversed wire, dangling endpoint, duplicate input, missing required value or changed node schema before play. Data-dependency and execution cycles are both rejected; use **Bounded Repeat** for deliberate repetition.

## Variables and Inspector values

An exposed graph variable compiles to the same `@export(...) let` declaration used by Rhai. The Inspector supports:

- checkboxes for Boolean;
- finite numeric input with optional minimum, maximum and step;
- text for String, Entity and Resource;
- paired x/y inputs for Vec2;
- bounded JSON editing for Data arrays/maps/null.

Per-object Inspector values override graph defaults without modifying the shared asset. Serialized variables keep runtime state according to Script2D's existing save behavior.

## Validation, determinism and safety

Each graph, variable, node, pin, edge and comment has a lowercase RFC 4122 UUID. UI language and translated titles never participate in identity or compilation. Save order uses ordinal UUID/key ordering, so repeated saves and different locales produce byte-identical canonical JSON.

Before play/build Nova_A validates format/version, bounded counts, UUID syntax/uniqueness, catalog node/pin schema, variable names/ranges, endpoints, direction, kinds, types, required values, single-input cardinality and cycles. A graph with errors produces no executable source. The generated source is inspected in the right panel and begins with its graph UUID, format and API version.

Limits in format v1 are 10,000 nodes, 20,000 edges, 1,024 variables, 2,048 comments, 128 pins per node and 1,024 bounded-loop iterations. Malformed assets over a document limit are rejected rather than silently truncated.

## Current 5.2 boundary

Version 5.2 establishes the graph language, editor, API parity and runtime attachment. User-defined functions, subgraphs/macros, graph libraries, visual breakpoints, active-wire debugging and state-preserving graph hot reload are intentionally scheduled for 5.3. No 5.2 interface claims those production features early.

