# Nova_A 26.01 visual scripting and Rhai parity

## User workflow

1. Select an existing `.rhai` asset in Assets or Script Studio.
2. Choose **Visual Graph**. Nova_A saves a dirty code draft first, creates or updates that script’s exact linked `.nova-graph`, selects it, and opens it—not the last graph and not a default graph.
3. Work in **Blocks** for the Scratch-inspired categories or **Nodes** for typed pins, data wires, routines, debugging, and production graph tools.
4. Save the graph. The linked Rhai asset is generated immediately with stable graph/node/variable markers.
5. Return to **Rhai Code**. Nova_A resolves the active graph back to its exact linked script and opens it.
6. Edit and save Rhai. Marker-owned regions update existing blocks; an unlinked script is structurally converted and linked on first switch.

## Supported structural conversion

- top-level serializable and exported variables → Variables blocks;
- lifecycle functions → Events blocks;
- custom functions and parameters → My Blocks routines and call blocks;
- `if` / `else` → Branch;
- bounded `for name in 0..count` → Bounded Repeat (runtime maximum 1,024);
- API-v2 commands → typed execution blocks;
- API-v2 value calls → typed value blocks;
- Boolean, comparison, and arithmetic expressions → Operators blocks;
- variable reads/writes → Get/Set blocks;
- literals → typed literal values;
- syntax without a safe structural mapping → visible bounded Rhai Expression, Statement, or Module blocks.

The fallback blocks are deliberate lossless compatibility—not deletion and not a false claim that arbitrary Rhai can always be represented as a small Scratch block set. Graph validation still rejects dangling pins, incompatible types, duplicate IDs, unbounded execution cycles, missing library nodes, and oversized documents.

## Exact contract

The two files are one authored behavior with two projections. The graph UUID is stored in script metadata and in the linked-source header. Code-save synchronizes that UUID’s graph; graph-save synchronizes every script linked to that UUID. Switching modes does not silently overwrite an unsaved code draft. Unsupported source remains visible and editable. Release verification covers variables, API values/commands, functions, conditions, loops, operators, identity, static Rhai analysis, and lossless fallback.
