# Nova_A UI Migration Plan

Status values:

- `NOT STARTED`
- `IN PROGRESS`
- `MIGRATED`
- `VERIFIED`
- `BLOCKED`

This file is the live implementation tracker for the UI rebuild.

## Global Definition of Done

The migration is complete only when:

- major editor surfaces use the new design system
- core legacy UI patterns are removed
- routine actions use a coherent SVG icon system where appropriate
- numeric properties are compact and predictable
- sliders are standardized
- navigation flicker is eliminated or any unavoidable technical limitation is documented
- panel geometry is stable
- inspector/property editing is coherent
- spacing and typography are consistent
- no major screen visibly belongs to an older UI generation
- relevant functionality still works
- build/tests pass
- visual QA has been performed

## Milestones

### M1 — Repository UI Audit
Status: `VERIFIED`

Deliverables:

- complete `UI_AUDIT.md`
- screen inventory
- component inventory
- flicker investigation
- legacy styling inventory

Acceptance criteria:

- all major UI surfaces identified
- major shared UI components identified
- likely flicker causes documented with code references
- migration risks recorded

---

### M2 — Finalize UI Specification
Status: `VERIFIED`

Deliverables:

- verify `UI_SPEC.md` against actual framework capabilities
- finalize tokens
- finalize component geometry
- finalize icon rules
- finalize layout rules

Acceptance criteria:

- no conflicting design rules
- actual UI framework can implement the design
- deviations are documented in `DECISIONS.md`

---

### M3 — Shared Design-System Foundation
Status: `VERIFIED`

Target components:

- semantic colors
- typography
- spacing tokens
- border/radius tokens
- icon button
- text button
- input
- numeric input
- slider
- dropdown
- checkbox
- tabs
- tree row
- property row
- property section
- tooltip
- menu
- scrollbar
- divider
- dialog/popup
- panel header

Acceptance criteria:

- shared components exist
- shared components use tokens
- legacy screens can migrate incrementally
- no arbitrary per-component visual constants unless documented

---

### M4 — SVG Icon System
Status: `VERIFIED`

Acceptance criteria:

- one coherent icon family/strategy
- consistent icon size and visual weight
- routine editor actions mapped to icons where appropriate
- no emoji production icons
- no random Unicode production icons
- tooltips provided for non-obvious controls

---

### M5 — Persistent Application Shell
Status: `VERIFIED`

Scope:

- top toolbar/navigation
- major docks
- workspace container
- inspector container
- bottom dock if applicable

Acceptance criteria:

- shell remains mounted/persistent where technically reasonable
- panel defaults are stable
- screen changes do not rebuild unrelated major regions

---

### M6 — Eliminate Navigation Flicker
Status: `VERIFIED`

Acceptance criteria:

- no visible white/black flash
- no blank intermediate frame
- no full-shell disappearance
- no unrelated panel geometry jump
- root cause fixed rather than visually hidden

---

### M7 — Hierarchy / Scene Navigation
Status: `VERIFIED`

Acceptance criteria:

- uses shared tree/list components
- compact rows
- consistent icon controls
- selection/hover/focus states match spec
- no arbitrary sizing
- functionality preserved

---

### M8 — Inspector / Property Editing
Status: `VERIFIED`

Acceptance criteria:

- shared property rows/sections
- compact numeric inputs
- consistent sliders
- concise labels
- stable alignment
- no giant full-width short-value inputs
- functionality preserved

---

### M9 — Viewport and Toolbar
Status: `VERIFIED`

Acceptance criteria:

- compact toolbar
- icon-first routine actions
- consistent tooltips
- stable geometry
- viewport maximizes useful workspace

---

### M10 — Asset Interfaces
Status: `VERIFIED`

Acceptance criteria:

- consistent browsing/list/tree patterns
- compact actions
- no unnecessary card/dashboard presentation
- functionality preserved

---

### M11 — Console / Debug Interfaces
Status: `VERIFIED`

Acceptance criteria:

- readable dense output
- compact controls
- consistent tabs/filters
- no unnecessary full-size form controls

---

### M12 — Animation UI
Status: `VERIFIED`

Acceptance criteria:

- coherent with main editor design system
- consistent numeric/slider controls
- stable layout
- functionality preserved

---

### M13 — Dialogs and Contextual Interfaces
Status: `VERIFIED`

Acceptance criteria:

- shared dialog structure
- clear primary/secondary actions
- no oversized controls
- consistent spacing and typography

---

### M14 — Project Management UI
Status: `VERIFIED`

Acceptance criteria:

- professional desktop-tool presentation
- no dashboard/card-heavy redesign unless semantically justified
- primary workflows remain clear

---

### M15 — Settings and Secondary Screens
Status: `VERIFIED`

Acceptance criteria:

- consistent sections
- compact controls
- no per-page control geometry divergence

---

### M16 — Legacy UI Eradication
Status: `VERIFIED`

Search for:

- deprecated UI components
- legacy style definitions
- old sliders
- old text-button implementations
- hard-coded colors
- arbitrary hard-coded widths/heights
- duplicate controls
- old icon systems
- obsolete panel implementations

Acceptance criteria:

- important legacy components reach zero usages where safe
- no competing design systems remain without documented reason
- dead styles/components removed

---

### M17 — Full Visual QA and Polish
Status: `VERIFIED`

Visual targets (where practical):

- 1920x1080
- 1600x900
- 1366x768

Acceptance criteria:

- no oversized controls
- no inconsistent input heights
- no inconsistent button sizes
- no giant standalone sliders
- no mismatched icon styles
- no clipped/overlapping content
- no unexplained large empty areas
- no accidental horizontal scrolling
- no unnecessary scrollbars
- no layout jumping
- no navigation flicker
- no screen visibly belonging to an older UI generation

## Surface Tracking Table

All major surfaces are migrated. Functional and visual evidence is summarized below; the final shared-property-column recheck and populated Animation follow-up passed.

| Surface | Status | Spec compliant | Functional verification | Visual QA | Notes |
|---|---|---|---|---|---|
| Main Editor Shell | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |
| Hierarchy / Scene | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |
| Inspector | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |
| Viewport | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |
| Asset Browser | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |
| Console / Debug | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |
| Animation | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |
| Project Manager | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |
| Settings | VERIFIED | Yes | Relevant workflows passed | 197-route traversal + screenshot review | Shared primitives; documented spatial exceptions retained. |

## Legacy Component Tracking

Source audit after migration:

| Legacy component/style | Current usages | Replacement | Target remaining usages | Status |
|---|---:|---|---:|---|
| editorReadability.css / editorStudio.css / editorForms.css | 0 imports | src/ui/editor.css + tokens.css + forms.css | 0 | VERIFIED: deleted, zero imports |
| Native standard range inputs | Baseline 34 + ConfigPanel render function | UiSlider | 0 outside shared primitive | VERIFIED: one input in UiSlider only |
| main.css | PlayerApp only | Retained player stylesheet; editor uses new entry | Documented exception | MIGRATED |
| Per-page primitive styles | Baseline 6,325 literal visual declarations | Shared components and tokens | Only domain geometry / documented exceptions | VERIFIED: 1,388 literals including centralized tokens/player CSS |

## Verification record

- Vue/TypeScript checks: passed; Vite production bundle: passed (existing chunk-size advisory remains).
- Focused shared controls: nine passing checks, including 100–200% geometry and saved compact/stacked-label preferences.
- Navigation: six passing assertions, fifteen transitions with zero blank samples, stable persistent nodes, real edit/undo/redo/save and fresh project isolation.
- Layout: 197 route screenshots; ten passing assertions; all screenshots reviewed via contact sheets with expanded fullshots for defects.
- Visual corrections: nine targeted checks across English100%, German150%, Chinese200%, including slider widths and Build text/badge separation.
- Final shared-column geometry recheck: 197 routes, ten passing assertions, zero geometry failures and zero console errors. Populated Animation: eleven asset/mode views plus docked and selected-clip captures reviewed; three functional/geometry assertions passed, including real save, preview suspension and bounded icons/inspector.
- Evidence is from the current development bundle, not native Windows installer or published-release qualification. No unrelated Rust/physics full sweep was rerun for these UI changes. Existing releases/26.32 remains immutable.

## Retained specialized implementations

- Native numeric/select/text/checkbox primitives keep existing event/ref/model modifiers and use centralized styling.
- Canvas, atlas, waveform, graph, timeline, collision matrices and virtualized rows retain domain coordinate geometry; virtual row calculations and CSS are kept in agreement.
- Native button semantics remain for data rows, menu controllers, meaningful workflow confirmations and source editors; routine commands use the original SVG family. Native title tooltips and the full-selected-value overlay share the tooltip strategy.
- Separate player CSS is retained; no second editor cascade remains.
- Explicit user jobs/network hosting continue while hidden. Visibility-only observers, auditions, gestures, timers and measurement work pause; project replacement disposes caches.
