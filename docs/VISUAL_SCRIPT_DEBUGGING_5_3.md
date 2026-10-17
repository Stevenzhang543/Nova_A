# Visual graph debugging, diff and merge — Nova_A 5.3

## Debug a running graph

Attach the graph through Script2D and press Play. Open **Graph details → Debug**.

1. Click the circle in any node header to set or disable a breakpoint.
2. Configure an optional condition, hit count or logpoint. A logpoint writes its formatted message without pausing.
3. Add watch expressions using the same bounded, side-effect-free expression evaluator as the Rhai debugger.
4. Use **Continue**, **Step into**, **Step over** or **Step out**. Runtime commands already executed are never replayed; pending commands continue from the exact trace boundary.
5. Inspect the active node/wire, call stack, latest watch values, per-node last/maximum/total time, node errors and graph coverage.

The Rust host emits ordered `graphTrace` commands containing graph/scope/node/wire UUIDs, call depth, elapsed microseconds and bounded values. The Vue debugger consumes this sequence deterministically. Graph traces use the same execution result as gameplay commands, so the debugger does not simulate a different program.

With reduced motion enabled at the operating-system level, active wires retain a thicker accent stroke but stop moving. Breakpoint, active, covered and error states remain distinguishable without animation.

## Semantic diff

Open **Diff / Merge**, capture or paste a base graph, and choose **Compare**. Changes are classified as added, removed, renamed, moved or modified using stable graph/routine/node/pin/edge/comment/symbol identities. Canonical key or array ordering does not create false changes.

## Three-way merge

Paste the shared base and incoming graph while the current graph is “ours”, then choose **Merge**.

- A value changed only on one branch merges automatically.
- Equal changes merge automatically.
- Independent UUID objects merge independently.
- When both branches changed the same identity differently, Nova_A creates an explicit conflict.

Choose **Keep ours** or **Keep theirs** for every conflict. **Apply resolved merge** remains disabled until all conflicts are resolved. The result is parsed, bounded and canonicalized before it replaces the editor document; Undo history retains the pre-merge graph.

## Diagnostic interpretation

- A red node border indicates a recorded runtime error.
- A bright accent border indicates the current execution node.
- The lower success edge indicates coverage during the current debug session.
- A moving accent wire is the most recently traversed edge.
- An orphan-breakpoint warning means its stable node UUID was removed; delete or retarget the breakpoint before release.

Runtime errors can still trigger the shared Script Debugger exception policy. The visual panel adds the graph identity and node context; it does not hide the underlying Rhai error.

