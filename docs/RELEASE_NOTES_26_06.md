# Nova_A 26.06 release notes

Machine version: **26.6.0**. Project Format: **2**. Schema: **29**. Rhai API: **2**. Visual Graph: **1**. Export Template: **1**.

## Added

- Production simulation authoring for exact compound children, static Chain/Concave geometry, rotational continuous collision detection, stable contact islands, motors, limits, break thresholds, collision-enabled Rope2D paths, and cloth-like rope lattices.
- One authoritative **1 grid unit = 1 metre** contract across authoring, Inspector values, runtime integration, debug evidence, replay, and exported players.
- Navigation regions, links, terrain costs, obstacles, radii, layers/masks, cancellable rebakes, deterministic steering/avoidance, A*, hierarchical A*, and flow-field paths.
- Behavior Tree and hierarchical state-machine authoring/validation, utility-state support, bounded deterministic 10,000-agent scheduling, localized diagnostics, and optional replay evidence.
- A shared Simulation readiness report used by World Studio, Project Health, Play/Step, save/reload validation, and Build.
- The `simulation-v2606-physics-navigation-ai` reference project, complete feature inventory, implementation contract, output-reliability contract, and EN/DE/ZH layout contract.
- A shared six-entry Export Template 1 registry used by both interactive Build Settings and the headless exporter, plus all-20-template Web and Windows-portable structural verification.

## Changed

- Visual Graph navigation now has focal wheel zoom, toolbar/slider/keyboard zoom, pan, Frame All, a minimap, zoom-correct multi-node dragging, tidy placement, low-detail rendering, responsive palette/details columns, and gesture-level history without removing advanced graph behavior.
- Selecting or saving a Rhai asset now hands off to its exact linked graph; supported edits synchronize in both directions and unsupported Rhai remains lossless.
- Single-line fields and placeholders are centered; multiline prose and code remain left aligned. Shared line height, letter spacing, wrapping, min-width, and independent-scroll rules apply across every editor surface.
- Public and machine authorities advance from 26.05/26.5.0 to 26.06/26.6.0 while Project Format 2/schema 29 and every frozen contract remain unchanged.

## Fixed

- Graph canvases no longer block zoom, pan, drag, selection, inline editing, or insertion because of nested input handlers or stale shallow-ref transforms.
- Automatic graph placement avoids overlapping nodes, and narrow/translated right-side graph controls remain within their owned column.
- Workspace tabs no longer overflow vertically at 125%/150% UI scale, and the device-preview preset no longer truncates its resolution label at 80% scale.
- Bound collision components suppress only the intended compound/joint group; ordinary joint chains no longer become accidentally collision-transitive.
- Rope/cloth paths exclude their endpoint owners while retaining third-body collisions, bounded stretch, motor/limit/break behavior, and smooth constrained motion.
- Navigation and AI validation no longer use unsafe deep recursion or fixed spatial cells that can miss large-radius agents.
- Build output now diagnoses unknown templates, missing scenes/assets, unsafe or colliding package paths, and reserved `project.nova` collisions consistently in UI and CLI.
- Clean output removes only stale files owned by the preceding valid build report and preserves unrelated creator files.
- The browser Accessibility panel now selects its Web ARIA fallback before desktop IPC, so web previews no longer display a raw unavailable-bridge exception; native capability discovery remains active in the desktop editor.

## Preserved

No feature, animation, public API, project field, schema, template, authoring path, renderer, scripting mode, or exported-game behavior was removed. Low-end and presentation settings may reduce cost, but they do not change gameplay semantics.

## Qualification boundary

The local release candidate includes TypeScript, Rust, WASM, Web, template, output, graph, history, interaction, layout-contract, security, benchmark, stability, Windows smoke, evidence, checksum, and exact-artifact gates. The checksum verifier uses a framework SHA-256 implementation so it remains available in minimal Windows PowerShell hosts. Publisher signing, disposable clean-machine lifecycle, second-machine reproduction, matching-host Linux/macOS builds, Android/iOS hardware and store review, independent usability/accessibility/security observation, rendered-glyph/IME review, and a real 72-hour soak remain explicitly external until performed.
