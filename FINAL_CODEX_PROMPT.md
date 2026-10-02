# Nova_A — Phase III
# Visual Refinement, Soft Geometry, Spatial Comfort & Motion System

You are responsible for the next Nova_A editor refinement phase.

Read the entire repository and all existing project/UI documentation before modifying implementation code.

In particular read:
- `AGENTS.md`
- current UI specification(s)
- UI migration/history documents
- engine/UX work completed in the previous phase
- `docs/ui/UI_VISUAL_V3_SPEC.md`
- `docs/ui/MOTION_SYSTEM_SPEC.md`
- `docs/ui/UI_MOTION_IMPLEMENTATION_PLAN.md`
- `docs/ui/MOTION_QA_CHECKLIST.md`

If `AGENTS_UI_MOTION_APPEND.md` has not been merged into `AGENTS.md`, treat its contents as active instructions and recommend merging them.

## 1. Context
The current Nova_A UI is already structurally successful.

Strengths:
- clean information hierarchy
- clear panel organization
- restrained visual language
- good readability
- reduced clutter

These strengths MUST be preserved.

Do NOT interpret this task as another complete redesign.

Current problems:
- slightly too plain
- launch/welcome page underdesigned and text-heavy
- surfaces/boundaries too rectangular
- panels/controls mechanically rigid
- spacing around text and controls sometimes too tight
- some dense areas cramped
- little decorative identity
- transitions too static
- dragging/reordering lacks tactile feedback
- menus/panels/content changes could feel much more fluid

Target evolution:
CURRENT: clean + precise + rigid + minimal
TARGET: clean + precise + soft + spacious + tactile + fluid + refined

## 2. Visual direction
Preserve current information architecture.

Evolve toward:
- softer geometry
- better whitespace
- more generous text/control padding
- clearer spacing rhythm
- restrained rounded corners
- subtle surface depth
- intentional accent color blocks
- coherent decorative motifs
- polished visual states
- richer but restrained launch-page composition

Remain a serious professional desktop tool.

Do NOT transform Nova_A into:
- a phone interface
- bubbles everywhere
- a glassmorphism showcase
- a marketing website
- a toy
- giant rounded cards
- visually noisy concept art

## 3. Apple-quality motion — principle, not copy
Take inspiration from high-quality Apple-platform interaction:
- immediate direct manipulation
- spring-like settling
- smooth continuity
- subtle depth
- restrained translucency
- polished opening/closing transitions
- high-quality drag feedback

Do NOT literally copy iOS controls/layouts.

Nova_A is mouse/keyboard desktop software.

Most importantly:
"Jelly" does NOT mean lag.

Dragged content must track pointer immediately and accurately.
Elasticity belongs primarily in:
- release
- settle
- neighboring-item movement
- docking preview
- secondary visual response

Never introduce elastic delay between cursor and manipulated object.

## 4. First action — audit before styling
Before implementation:
1. Build and test the current repository.
2. Launch Nova_A.
3. Establish visual/performance baseline.
4. Inspect existing design system.
5. Determine actual UI framework and rendering capabilities.
6. Determine support for:
   - opacity animation
   - transforms
   - layout animation
   - clipping
   - shadows
   - blur/backdrop filtering
   - compositor/GPU acceleration
   - timers
   - easing/spring APIs
7. Audit every major screen for:
   - cramped text
   - insufficient padding
   - excessive rectangularity
   - excessive borders
   - weak surface hierarchy
   - missing visual identity
   - abrupt state changes
8. Audit drag/reorder interactions.
9. Audit panel/window transitions.
10. Update `UI_MOTION_IMPLEMENTATION_PLAN.md`.

Do not guess about blur or animation capability.

## 5. Evolve design tokens first
Do not hand-edit dozens of panels first.

Centralize/refine:

### Radius
Create:
- xs
- sm
- md
- lg
- xl
- pill where appropriate

No arbitrary radii.

### Spacing
Use distinct spacing for:
- tightly related controls
- normal property rows
- section separation
- panel insets
- major composition

Do not globally enlarge everything.

### Surfaces
Define/refine:
- app background
- panel
- raised
- hover
- selected
- floating
- overlay

Use surface contrast to reduce border dependence.

### Elevation
Standardize:
- border
- separator
- subtle shadow
- floating shadow

### Accent/decorative tokens
Centralize branded color and decorative motif.

## 6. Soften geometry without destroying density
Rules:
- docked panels still form one workspace
- do not make every panel a floating card
- do not add large gaps everywhere
- do not make every tree/property row a pill
- dense lists remain dense
- inputs/buttons may become moderately rounder
- floating/dialog/launch surfaces may use larger radii

Goal: soft structure, not bubble UI.

## 7. Improve whitespace and text comfort
Increase room:
- panel edge to content
- around panel titles
- section title to first property
- between unrelated groups
- inside text-bearing controls
- icon-to-label
- empty states
- dialogs
- welcome screen

Preserve compactness inside tightly related property groups.

## 8. Reduce boxiness
Where appropriate replace excessive outlines with:
- spacing
- subtle surface contrast
- restrained separators
- contextual elevation

Do not make every region a visible rectangle.

## 9. Add restrained visual identity
Design one coherent Nova_A motif.

Possible inspiration:
- nodes
- vectors
- grid geometry
- 2D engine primitives
- connected points
- abstract scene/transform shapes

Use subtly in:
- welcome screen
- empty states
- safe large inactive backgrounds
- selected branded areas

Do not scatter unrelated decorations across every panel.

## 10. Refine launch/welcome experience
Redesign composition while preserving simplicity.

Evaluate:
- Nova_A identity/logo/mark
- concise product descriptor
- Create Project
- Open Project
- Recent Projects
- templates/quick-start options if supported
- version/status information
- restrained decorative background/motif

Use stronger spatial composition and whitespace.
Launch can be more expressive than editor.
Add polished restrained entrance/hover motion.
Do not make a marketing landing page.

## 11. Create a real motion system first
Do NOT scatter arbitrary `200ms ease` snippets.

Implement/centralize reusable motion following `MOTION_SYSTEM_SPEC.md`.

At minimum provide concepts equivalent to:
- micro/instant
- fast
- standard
- emphasized
- spring.snappy
- spring.smooth
- spring.elastic

Exact implementation depends on framework.

## 12. Microinteractions

### Buttons
Hover: subtle surface/tint transition.
Press: immediate feedback; optional tiny compression/depth.
Release: fast natural settle.

### Tabs
Smooth active state/indicator movement.
No flashing.

### Expand/collapse
Animate disclosure indicator and short content transition.

### Focus
Smooth focus state; never delayed.

### Selection
Transition selection states rather than harsh visual flashes.

Keep all microinteractions fast.

## 13. Panel/content transitions
Use motion only where it communicates structure.

Candidates:
- bottom panel open/close
- contextual inspector content
- tool panels
- side panes
- workspace mode changes
- secondary drawers

Rules:
- persistent shell stable
- no entire-editor sliding
- no cinematic transitions
- no blank frame
- no fade-to-black
- no animation hiding slow loading

Use small translations, opacity, clipped reveal, or spring size settling only when useful and efficient.

## 14. Dragging is first-class
Audit ALL drag operations:
- hierarchy reorder
- hierarchy reparent
- asset drag
- resource assignment
- tab drag
- panel docking
- viewport manipulation
- TileMap interactions
- animation/keyframes

### Direct manipulation
Actual manipulated object must track pointer accurately and immediately.
NO artificial elastic pointer lag.

### While dragging
Use subtle:
- elevation
- shadow
- scale
- transparency
- drag preview
- destination highlight

### Reordering
Neighbors should smoothly move out of the way where practical.

### Drop
Spring settle to final position.

### Cancel
Return cleanly.

### Docking
Show responsive docking preview and subtle target animation.

Target feeling: tactile and jelly-like without imprecision.

## 15. Blur/translucency/materials
User wants fluid dynamic blur.

First determine what the actual stack can support efficiently.

Good candidates:
- command palette
- popovers
- menus
- modal backdrop
- floating transient surfaces
- welcome decorative material
- temporary drag overlays

Do NOT blur every persistent panel.

Hierarchy, inspector, viewport remain crisp.

If backdrop blur is unavailable/unstable/expensive, use:
- tinted transparency
- static/precomputed blur where appropriate
- opaque material with subtle elevation

Do not sacrifice performance to satisfy the word "blur".

## 16. Do not confuse blur with motion blur
Normal text and controls remain crisp during motion.
Do not add cinematic motion blur to:
- buttons
- labels
- panels
- inspector controls
- hierarchy rows

## 17. Spring physics
Where framework permits, prefer coherent spring interpolation over arbitrary bounce keyframes.

Named presets must be:
- stable
- interruption-safe
- bounded
- time-step safe

Examples:
- button: very snappy, near-zero overshoot
- tab: snappy/smooth
- panel: smooth
- drag settle: slightly elastic
- launch decoration: may be more elastic

Do not bounce everything.

## 18. Interruptible animations required
Handle:
- open then immediately close
- switch tab during transition
- repeated selection changes
- drag before hover completes
- reopen panel before closing finishes
- resize during transition

Do not queue stale endpoint animations.

Where possible animate from current presentation state to newest target.

Logical and visual states must not diverge.

## 19. Performance is hard requirement
Before/after test:
- typing latency
- button response
- hierarchy scrolling
- asset scrolling
- inspector scrolling
- hierarchy drag
- asset drag
- panel resize
- workspace switching
- menu/dialog open
- project launch
- idle CPU/GPU

Profile where available:
- frame time
- layout passes
- repaint cost
- GPU composition
- blur cost
- allocations

Prefer compositor-friendly transform/opacity when supported.
Avoid expensive full layout/repaint every frame.

If effect harms responsiveness, simplify it.

## 20. Reduced motion
If technically reasonable:
- remove strong overshoot
- disable continuous decorative movement
- minimize large translations
- use fast fades/near-instant change
- preserve hover/focus/selection

Motion must never be required to understand state.

## 21. Specialized editors
Apply same V3 visual/motion language to:
- animation editor
- TileMap/TileSet
- physics
- game UI editor
- input mapping
- profiler/debugger
- settings
- project management

Do not let each subsystem invent its own style or animation curves.

## 22. Visual QA
Use `MOTION_QA_CHECKLIST.md`.

Test representative sizes where practical:
- 1920×1080
- 1600×900
- 1366×768
- current minimum supported size

## 23. Visual baseline
If practical, capture/reference:
- launch screen
- main editor
- inspector
- hierarchy
- assets
- animation
- TileMap
- settings

Do not introduce disproportionate screenshot infrastructure.

## 24. Do not reintroduce old UI problems
Do not reintroduce:
- giant controls
- giant sliders
- excessive text buttons
- random icon styles
- arbitrary panel dimensions
- excessive card layouts
- unnecessary instructional text
- inconsistent input heights
- navigation flicker
- unstable geometry

Visual richness must not undo structural discipline.

## 25. Development process
For each milestone:
1. inspect current implementation
2. define intended visual/interaction change
3. update shared tokens/components first
4. implement
5. build
6. run tests
7. launch Nova_A
8. inspect actual result
9. interact with controls
10. test rapid/repeated interaction
11. profile if motion/blur involved
12. fix regressions
13. update implementation plan
14. inspect neighboring surfaces
15. review diff

Compilation is not UI validation.

## 26. Autonomy
Use professional product-design and UI-engineering judgment.

You may independently decide:
- exact token values
- exact radii
- exact padding
- exact spring parameters
- exact duration/easing presets
- exact decorative motif
- exact accent placement
- component-level animation

Do not ask for trivial design choices.

Ask only if a decision would:
- materially alter successful information architecture
- remove important functionality
- require major new dependency
- require major renderer/UI-framework rewrite
- significantly affect platform compatibility

## 27. Definition of done

### Static visual
- clear hierarchy preserved
- launch screen intentionally designed
- editor less rigid
- whitespace improved
- cramped relationships fixed
- rounded geometry coherent
- panel treatment remains professional
- restrained accent/decorative identity exists
- richness does not become clutter

### Motion
- shared motion system exists
- microinteractions consistent
- useful panel/content transitions polished
- open/close behavior coherent
- animations interruption-safe
- animations never block input

### Drag
- pointer fidelity exact
- tactile feedback clear
- targets clear
- reordering smooth where practical
- drop/cancel settles naturally
- no artificial cursor lag

### Blur/material
- used selectively
- persistent work surfaces readable
- fallback exists
- performance acceptable

### Performance
- no meaningful new typing/click/drag latency
- no persistent animation hitching
- no new navigation flicker
- no unacceptable idle resource use

### Consistency
- specialized editors use same V3 system
- no major screen belongs to a different visual generation
- no large collection of arbitrary animation constants
- existing UI architectural quality has not regressed

Final target:
Nova_A's existing clean professional editor, matured into a softer, more spacious, tactile and highly fluid product — not replaced by a different product.

Begin with the audit and baseline now. Do not immediately apply random styling changes.
