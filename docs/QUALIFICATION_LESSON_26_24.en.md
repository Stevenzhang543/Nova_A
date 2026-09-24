# 26.24 structured graph and readable workspace lesson

This lesson describes the intended 26.24 workflow and implemented contracts. Development checks are not final release qualification; consult the implementation tracker and frozen evidence for release status.

## Code and graph ownership

Open the code reference and create a Rhai script in Script. Named functions belong at module scope; break/continue belong inside loops. Arrays, maps, closures, dynamic calls, branches, loops, exception handling and project use dependencies retain the same parser and runtime limits. Editable structural regions have nodes. Legacy Execute Rhai regions that retain source are explicitly source-backed, not structural coverage. Invalid regions block conversion while the editor and dirty draft stay open.

Write a function with a Chinese comment, switch to graph, rename a declaration, change a literal, return to code and inspect comments, scope and references. Undo, redo, save, reopen and export Web. Reordering function parameters changes call semantics; it does not infer an automatic caller migration. A single-file rename with external module consumers must reject unsafe changes. Review callers before changing an interface.

## Arrangement and fixed positions

Nodes use measured bounds. Completing a manual drag pins its position; cancelling with Escape does not create a pin. Select a node and use the graph commands to pin or unpin it. Ordinary arrangement preserves fixed positions and avoids them. Only the explicit full rearrangement including pinned nodes may move them. Pin metadata affects editor geometry, not emitted Rhai. Check that one undo restores the position and pin state together.

Switch repeatedly between Script and Design and inspect grid size, selection and graph state. The existing canvas is retained across workspace transitions and resized when visible again. Closing the project still requires resource disposal. Short local transition measurements do not certify leak freedom or universal frame rates.

## Diagnostics and original details

English, German and Chinese share structural labels, ports and diagnostic display sources. Diagnostic codes remain stable. German and Chinese show an explanation and expandable original details containing exact identifiers, source positions and underlying messages. Unknown diagnostics remain verbatim. Try const broken; and request conversion: it must report the missing initializer and preserve the draft exactly. Correct the source before proceeding.

## Bottom docks and large resource lists

At widths 1024, 1440 and 1920 and UI scales 100%/200%, visit every bottom tab. Narrow docks offer a tab selector while expand/collapse controls remain reachable. The asset toolbar owns its full row allocation and the resource area supplies the primary scroll. A 600-item fixture retains full list height through an inner spacer while mounting only the nearby window. Reach the last resource, switch to list view, leave Assets, resize and return: all resources must remain available.

## Programmer checks

Run this release's graph equivalence, localization, graph user, diagnostics, resource window and bottom dock tests, then the retained syntax slot, typed graph, layout and release tooling suites. Equivalence checks force structural regeneration and compare original/generated programs on native and WASM runtimes. A language table is not execution evidence; screenshots are not real pointer and keyboard checks. All 21 release gates, a frozen source snapshot and 11 independently verified release files remain release prerequisites.

## Qualification boundaries

Only executed local Windows/Web results may pass. Linux/macOS/iPhone/Android, actual low-end computers, signing, independent accessibility/security and a real 72-hour soak require their corresponding environments. Chinese comment coverage is tracked separately; file counts and generic generated text do not constitute semantic review.
