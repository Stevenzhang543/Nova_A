## Nova_A UI Visual Polish & Motion Rules

These rules supplement the existing Nova_A UI/UX rules. They do not replace the existing UI information architecture unless a later documented decision explicitly does so.

### Preserve the current structural success
The current editor structure, hierarchy, clarity, and major workflows are the baseline.
Do not perform another wholesale information-architecture rewrite merely to introduce visual polish or animation.

Prefer:
- visual refinement
- spacing refinement
- component geometry refinement
- richer material treatment
- motion-system integration
- improved drag feedback
- better transitions
- consistent depth and emphasis

Do not destroy the existing clarity.

### Visual direction
Nova_A should remain a professional desktop development tool, but should no longer feel excessively rigid, sparse, cramped, or mechanically rectangular.

Desired character:
- clean
- soft
- spacious
- fluid
- tactile
- refined
- slightly expressive
- modern
- professional

Use soft geometry, intentional whitespace, subtle depth, controlled accent color, and restrained decorative graphics.

Do not turn Nova_A into:
- a mobile app
- a toy
- a glossy concept mockup
- a glassmorphism demo
- a collection of floating bubbles
- an interface dominated by blur
- an interface where animation delays work

### Geometry
Use a coherent radius scale instead of arbitrary corner radii.
Favor softer panel and control shapes while preserving density suitable for a desktop editor.
Adjacent/docked panels should still visually belong to the workspace. Do not round every internal boundary independently if this creates awkward gaps.

### Spacing
Increase breathing room around text, panel headers, property groups, inputs, tabs, and major content boundaries.
Never solve cramped UI merely by globally scaling everything up.
Use spacing hierarchy:
- compact spacing for tightly related controls
- moderate spacing between property groups
- larger spacing between unrelated sections

### Material and decoration
Use restrained surface differentiation, tinted regions, subtle gradients where justified, low-contrast decorative shapes, and controlled accent blocks.
Decorative graphics must:
- support hierarchy or identity
- remain behind content
- avoid reducing readability
- avoid competing with the viewport
- avoid visual noise

### Motion
All motion must come from shared motion tokens/presets rather than one-off arbitrary durations and easing curves.

Prefer spring-like motion for:
- drag settling
- panel expansion
- selection movement
- contextual surfaces
- small positional transitions

Prefer short eased transitions for:
- hover
- color
- opacity
- focus
- simple state changes

Motion must communicate state and spatial continuity, not merely decorate.

### Dragging
Direct manipulation must feel immediate.
During dragging:
- the dragged object follows the pointer without perceptible lag
- visual lift/scale/shadow may increase subtly
- valid destinations provide clear feedback
- invalid destinations remain clear
- neighboring layout changes should animate coherently when useful
- release should settle naturally
- canceled drags should return predictably

Never add elastic lag between the pointer and the actual drag target merely to imitate "jelly".

### Blur and translucency
Blur/translucency may be used selectively for temporary or floating layers such as:
- command palette
- menus
- popovers
- transient overlays
- modal backdrops
- launch/welcome accents

Do not blur every panel.
The central workspace and persistent editing surfaces must remain crisp and readable.

If real-time blur is too expensive or unavailable, use an intentional opaque/tinted fallback instead of a broken or slow effect.

### Performance
Animation quality is part of correctness.
No visual effect may introduce unacceptable:
- input latency
- typing latency
- drag latency
- scrolling hitching
- persistent frame drops
- flicker
- unnecessary GPU/CPU load

Animate transform/opacity or equivalent compositor-friendly properties where the actual UI framework permits.
Avoid repeatedly triggering expensive full-layout reconstruction on every animation frame.

### Accessibility / reduced motion
Provide a reduced-motion mode or equivalent configuration if the UI framework makes it practical.

Reduced motion should:
- remove strong overshoot
- minimize large translations
- shorten or remove nonessential transitions
- preserve immediate state feedback

### Validation
UI motion work is not complete because it compiles.

Inspect:
- static composition
- hover/focus states
- opening/closing
- dragging
- resizing
- scrolling
- panel switching
- modal/menu behavior
- startup
- minimum supported window size
- high-density screens where testable

Do not use animation to conceal architectural flicker or slow loading.
