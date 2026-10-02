# Nova_A 26.34

Engine26.34.0; Project Format2/schema29 stays compatible. Release destination: `releases/v26.34`.

- Runtime saves preserve nested Unicode/space/prototype-looking map keys, serialize custom data once, and keep cancelled or stale-project async operations from publishing state. Public root key/slot normalization and v2 envelopes remain compatible.
- Particle preview preserves authored autoplay; camera follow margins respect zoom, rotated axes and subviewports.
- Game UI consumes handled wheel scrolling. Bare game canvases receive unhandled wheel input once; editor/native fields retain normal scrolling.
- Profiler empty/invalid captures cannot certify measured budgets. Unsupported GPU timing and estimated overhead remain explicit. Input latency label describes CPU submission.
- Imported-font controls explain supported browser rendering and metadata-only advanced modes in English, German and Chinese.
- The final A–Z/AA capability matrix, official comparator review, declared feature catalog, representative game tests and actual authoring workflows document integration and limits. Existing compact SVG controls/shared geometry/persistent shell are retained.

## Verification

Important defects were reproduced before repair. Focused save/render/input/profiler tests execute current production modules; representative scenarios use compiled WASM. Actual browser gates create/save/reopen/play projects, author nested prefabs, consume UI input, edit code/graph with undo/redo and complete/restart an independently downloaded game. All-panel geometry/navigation is checked separately. Final pass status comes from the successful frozen-source release-evidence archive, not this document alone.

Exact affine shear, arbitrary navmesh/shader parity, GPU particle simulation and advanced font rasterization are deferred or out of scope as listed in FEATURE_MATRIX.md. No claim of zero bugs, all-code branch coverage, universal performance, physical accessibility/audio/phone qualification or clean-machine installation. Native stdio remains physics-only; renderer-disabled full-game authority is distinct.

## Delivery

Eleven required files: ledger, license, release notes, SHA256SUMS, source/Web/reference/evidence ZIPs, Windows portableEXE/setupEXE/MSI. Independent packaging validates frozen source, exact versions, native binaries, evidence, archive closure and checksums before immutable publication. Historical releases are preserved.

The representative top-down audit also reproduced a native interpolation feedback defect: syncing velocity/shape changes resent the displayed previous pose and rewound solver movement. World now retains native position/rotation separately, preserving unchanged physics pose while honoring explicit transform writes, teleport, character movement, origin shift and reset/destroy. Real WASM tests cover Interpolate/None and irregular timing.
