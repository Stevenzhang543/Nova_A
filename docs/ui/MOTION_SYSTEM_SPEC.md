# Nova_A Motion & Interaction System Specification

## Goal
Create one reusable motion system for Nova_A inspired by high-quality Apple-platform interaction:
- immediate response
- direct manipulation
- spring-like settling
- spatial continuity
- restrained translucency
- polished transitions

Do not copy iOS literally. Nova_A is a desktop editor.

## Principles
1. Immediate input response.
2. Natural settling.
3. Preserve spatial continuity.
4. Short by default.
5. Motion communicates hierarchy/state.
6. Large motion is rarer than small motion.
7. No animation blocks productivity.
8. Repeated actions should remain fast.
9. Prefer interruption-safe animations.
10. User interaction always outranks animation.

## Motion tokens
Create shared semantic families.

### Micro
For hover tint, press state, focus ring, tiny state changes.
Suggested: 60–110 ms.

### Fast
For tooltip, tab indicator, small opacity transitions.
Suggested: 110–170 ms.

### Standard
For popover, section expand/collapse, small layout change.
Suggested: 170–240 ms.

### Emphasized
For dialogs, welcome composition, major contextual panes.
Suggested: 220–340 ms.

Use framework-native spring parameters when appropriate.

## Spring presets

### spring.snappy
Use for:
- button release
- active indicator
- small dragged-item settle
- compact contextual motion
Quick, little overshoot, strongly damped.

### spring.smooth
Use for:
- panel expansion
- rearrangement
- popovers
- moderate layout transitions
Smooth, controlled, minimal overshoot.

### spring.elastic
Use sparingly for:
- drag/drop settle
- docking preview
- playful launch accent
Noticeable but restrained overshoot.

Do not use elastic everywhere.

## Component states
Reusable interactive components should define:
- idle
- hover
- pressed
- focused
- selected
- disabled
- loading if applicable
- drag source
- drag target

## Buttons
Hover: subtle surface/color transition.
Press: immediate feedback; optional tiny visual compression.
Release: snappy return.
Do not blur text/icons through poor transforms.

## Panel motion
Use only for meaningful structural changes.
During manual resize: geometry follows pointer immediately, no spring lag.
After release: optional tiny settle if helpful.

## Expand/collapse
Animate:
- disclosure indicator
- content reveal
- very subtle opacity if useful
Keep short.

## Tabs and selection
Use continuity:
- active indicator glides
- selected surface transitions quickly
- tiny content crossfade/shift if useful
Avoid large page slides.

## Menus and popovers
Open:
- opacity + tiny scale/translation
- optional selective material effect
Close slightly faster.
No exaggerated zoom.

## Dialogs
Backdrop:
- restrained fade
- selective tint/blur where supported

Dialog:
- subtle opacity + scale/vertical movement
- smooth/emphasized spring
Keyboard focus must not be delayed.

## Drag and drop: "jelly" without lag

### While dragging
- drag visual follows pointer 1:1
- source may lift slightly
- shadow/elevation may increase
- scale may increase slightly where appropriate
- valid targets react quickly
- insertion indicators move smoothly

### Reordering
Neighboring rows/items move smoothly into predicted positions where practical.

### Drop
Use snappy/smooth spring settle.

### Cancel
Return predictably with a short spring.

### Docking
Show responsive docking preview; final panel settles after drop.

### Never
- delayed elastic tether between cursor and object
- imprecise hit testing
- visual position differing from logical drag position

## Scrolling
Keep wheel/trackpad response immediate.
Do not force artificial mobile inertial scrolling if the desktop framework already handles it.

## Blur and translucency
Good candidates:
- modal backdrop
- command palette
- popup/menu
- transient floating inspector
- launch decorative layer

Poor candidates:
- hierarchy panel all the time
- inspector text background
- every toolbar/panel simultaneously

Blur must degrade gracefully.
Fallback: tinted/opaque material.

## Motion blur
Do not add camera-style motion blur to normal UI controls.
Controls should remain crisp while moving.

## Workspace switching
Persistent shell remains stable.
Possible:
- fast crossfade
- tiny indicator motion
- restrained translation

Never:
- blank frame
- fade-to-black
- full-shell reconstruction
- slow cinematic transitions

## Launch-screen motion
Can be more expressive:
- slow decorative gradient drift
- subtle parallax
- soft floating motif
- entrance choreography
- hover lift on project items

Constraints:
- settle quickly
- no endless bouncing
- no high idle GPU usage
- no interference with opening a project

## Notifications
Short slide/fade; stable reading time; clean exit.
Errors should not wobble/bounce for attention.

## Performance budget
Verify:
- no input delay
- smooth drag
- smooth panel transitions
- smooth menu/dialogs
- no persistent high idle CPU/GPU
- no heavy repeated allocation during animation

Profile where possible:
- frame time
- UI update time
- layout passes
- repaint cost
- blur cost

## Reduced motion
If practical:
- remove overshoot
- replace large translations with opacity
- near-instant drag settle
- disable decorative background movement
- preserve focus/selection feedback

## Motion QA
Test:
- launch screen
- project opening
- workspace switching
- panel open/close
- panel drag/dock
- hierarchy drag
- asset drag
- inspector expand/collapse
- tabs
- menus/popovers
- dialogs
- tooltips
- notifications
- resizing
- rapid repeated input

Animations must be interruptible.

## 26.35 implementation contract

Shared implementation: src/ui/motion.ts and src/ui/motion.css, installed once by main.ts with an explicit disposer. Families are micro 80 ms, fast 140 ms, standard 200 ms and emphasized 280 ms. CSS tint/focus uses the shared easing token; presence and FLIP use actual sampled damped spring responses through finite linear Web Animations. No continuous decorative simulation runs at idle.

| Preset | Stiffness | Damping | Mass | Application |
|---|---:|---:|---:|---|
| snappy | 700 | 48 | 1 | Compact presence and short exit |
| smooth | 360 | 36 | 1 | Dialog/palette entrance and committed neighbor settling |
| elastic | 480 | 32 | 1 | Restrained optional contextual settle; not direct pointer coordinates |

Input and state commit immediately. Pending animation is cancelled or retargeted from displayed geometry; only one completion owns surface removal. Native focus remains immediate and closing overlays become inert and aria-hidden. Reduced motion, editor motion off and low-end policy settle active jobs and remove decorative transitions. Unsupported Web Animations completes synchronously. High contrast removes blur; reduced/system-reduced motion and unsupported backdrop filters also use opaque material.

FLIP measures at most 80 mounted elements, not an entire virtual list. Native hierarchy/assets/tabs/docks expose source/valid/invalid/insertion feedback. Native drag images use newly created inert DOM previews; see the [platform drag-image contract](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/setDragImage). Physical cursor-image rasterization still needs visible host observation. Direct viewport, graph, tile, timeline, waveform and resize interactions retain their domain geometry. Resource-field drops, arbitrary floating-window dragging and animation clip dragging are unavailable; keyframe neighbor motion is deferred pending stable key identity.

Presence is integrated in shared menus/dialogs, command palette, shared property sections, moving tab indicator, launcher and floating docks. Native inspector details retain their immediate disclosure semantics. Tooltips/notifications keep their existing immediate presentation and shared surface/state styles; no delay or bouncing is added. Workspace switching retains persistent content without full-shell presence.

Blur is limited to menu/palette material, 10 px at 96% surface opacity. The executed motion report retains raw baseline/refined timings, renderer layout/style/task counters, idle and blur-on windows, and functional blur-off fallback assertions. Paint/raster/GPU costs and paired quantitative blur costs remain unavailable. Browser rAF and event-to-observed-frame data are software-renderer diagnostics, not physical input-to-display, system CPU/GPU or universal frame-rate guarantees.
