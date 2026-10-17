# Nova_A 26.02 Visual Graph interaction and performance contract

## Navigation and drawing

- Mouse-wheel zoom is handled in the capture phase with `preventDefault` and `stopPropagation`, so nested nodes, inputs, and panels cannot steal canvas navigation.
- Zoom is focal: the graph-space point beneath the cursor remains beneath the cursor. The safe range is 10–400%.
- Minus/plus buttons, a continuous slider, a clickable percentage reset, Frame All, and the minimap provide equivalent reachable navigation.
- Empty-space drag pans. Shift-drag box-selects. Double-clicking empty space opens the palette and inserts at that graph position.
- Connections support drag from output to a highlighted compatible input and the retained click-output/click-input path. Data types must match or explicitly use `Data`; input pins remain single-source.
- Block layout is never silently rewritten when a graph opens or when switching authoring modes. **Tidy blocks** is explicit and undoable.

## Performance architecture

- Pan, node drag, comment drag, and pending-wire pointer motion are coalesced to one reactive update per animation frame.
- A gesture records one history boundary rather than serializing the whole graph for every raw pointer event.
- Pure viewport gestures do not recompile Rhai.
- Scratch layout builds node, incoming, outgoing, and execution-pin indexes once: O(nodes + edges), iterative, with no recursive stack overflow at 10,000 nodes.
- Above 300 nodes, viewport culling mounts only visible nodes plus a graph-space margin. Edges are filtered against the visible-node set.
- Above 500 nodes or below 42% zoom, non-semantic drop shadows are simplified. Nodes, wires, active-wire animation, debugging state, minimap, and authored data remain present.
- The graph canvas uses layout/paint containment and transform-only panning/zooming.

## Preserved behavior

Scratch block mode, advanced typed-node mode, all categories, code/graph two-way conversion, unsupported-code blocks, comments, variables, routines, macros, subgraphs, interfaces, graph libraries, breakpoints, active animated wires, watches, call stack, coverage, timings, refactor, semantic diff/merge, hot reload, undo/redo, and package nodes remain. No animation, visual component, node kind, shortcut, or authoring capability was removed.

## Qualification

Automated verification covers focal zoom invariants and clamping, direct connection controls, saved-layout preservation, a 10,000-node/9,999-edge indexed layout without recursion, compiler validity, EN/DE/ZH labels, reduced-motion retention, and responsive layout. Real low-end input-to-pixel measurements and prolonged editing sessions remain part of broader performance/soak evidence.

