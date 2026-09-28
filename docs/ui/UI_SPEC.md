# Nova_A UI Specification

Status: Active source of truth for the Nova_A editor UI/UX rebuild.

## 1. Product Intent

Nova_A is a desktop game-engine/editor tool. Its interface must feel deliberate, compact, professional, technically precise, and visually coherent.

The editor should feel like one product designed by one team.

High-level inspiration may be taken from the interaction quality of professional tools such as Figma, VS Code, Blender, modern Godot, and JetBrains IDEs, but Nova_A must not directly copy any single product.

### Core principle

**Preserve capability. Replace presentation.**

The existing UI is a source of functional requirements, not a visual reference.

## 2. What the Interface Must Not Become

Nova_A must not feel like:

- a website
- a web dashboard
- a mobile application
- a settings form
- a collection of cards
- a collection of random widgets
- a student project

Avoid:

- oversized controls
- giant buttons
- giant standalone sliders
- excessive rounded rectangles
- card-heavy dashboard layouts
- excessive instructional text
- inconsistent spacing
- inconsistent control geometry
- high-saturation/neon colors
- gratuitous gradients
- glow effects
- arbitrary per-screen styling

## 3. Visual Character

The visual language should be:

- dark
- restrained
- low-saturation
- compact
- professional
- information-dense
- visually quiet
- predictable
- modern
- technically precise

Use hierarchy primarily through:

- spacing
- typography
- alignment
- separators
- subtle surface changes
- grouping

Do not rely on decorative containers to create hierarchy.

## 4. Semantic Color System

Centralize colors as semantic design tokens. Individual screens must not invent colors.

Recommended starting palette (adjust only if the final system remains equally restrained and coherent):

| Token | Suggested value | Purpose |
|---|---:|---|
| `bg.0` | `#111318` | Root/editor background |
| `bg.1` | `#171A20` | Secondary background |
| `bg.2` | `#1D2128` | Raised surface/panel |
| `surface.hover` | `#242932` | Hover state |
| `surface.active` | `#2B313C` | Active/pressed/selected surface |
| `border.default` | `#303640` | Standard borders |
| `text.primary` | `#E5E8EC` | Primary text |
| `text.secondary` | `#9DA5B1` | Secondary text |
| `text.disabled` | `#646B75` | Disabled text |
| `accent.default` | `#5B8DEF` | Accent/selection |
| `accent.hover` | `#6C99F0` | Accent hover |
| `status.danger` | `#D95C64` | Destructive/error |
| `status.warning` | `#D7A64A` | Warning |
| `status.success` | `#55A879` | Success |

Rules:

- avoid pure black if near-black works better
- avoid excessive pure white
- avoid highly saturated blue
- avoid neon colors
- avoid decorative gradients unless functionally justified

## 5. Typography

Use a compact desktop-tool typography system.

Define centrally:

- primary UI font
- standard size
- compact size
- section-header size
- font weights
- line heights

Keep variation limited.

Recommended hierarchy:

- standard UI: 12-13 px equivalent
- compact secondary labels: 11-12 px equivalent
- section headers: 12-13 px, medium/semibold
- dialogs/large labels: only when hierarchy genuinely requires it

Avoid oversized headings inside normal editor panels.

## 6. Spacing Tokens

Use a small spacing scale. Suggested baseline:

| Token | Value |
|---|---:|
| `space.micro` | 2 px |
| `space.xs` | 4 px |
| `space.sm` | 8 px |
| `space.md` | 12 px |
| `space.lg` | 16 px |
| `space.xl` | 24 px |

Do not add arbitrary values throughout individual screens without a documented reason.

## 7. Control Geometry

Controls must use globally consistent dimensions.

Suggested baseline:

| Control | Baseline |
|---|---:|
| Toolbar icon button | 28 x 28 px |
| Compact input | 28 px height |
| Standard input | 32 px height |
| Tree row | 24 px height |
| Menu item | 28 px height |
| Tab | 30-32 px height |
| Property row | 28-32 px depending on control type |

Exact values may be adjusted slightly to fit the actual UI framework, but consistency is mandatory.

No screen may invent arbitrary control heights.

## 8. Icon System

Routine editor actions should primarily use compact SVG icon buttons.

Examples:

- New
- Open
- Save
- Undo
- Redo
- Add
- Remove
- Delete
- Duplicate
- Play
- Pause
- Stop
- Search
- Visibility
- Lock
- Unlock
- Refresh
- Settings
- Expand
- Collapse
- Move
- More actions

Requirements:

- coherent SVG icon family
- approximately 16x16 coordinate system for normal icons
- consistent stroke/fill strategy
- consistent visual weight
- consistent alignment and padding
- state support: normal, hover, active, disabled
- tooltips for non-obvious icon buttons

Do not use:

- emoji
- random Unicode glyphs
- mixed unrelated icon families
- inconsistent filled/outline styles
- text pretending to be an icon

Text buttons remain appropriate when wording is important, such as:

- Create Project
- Import
- Apply
- Cancel
- Save Changes

Icon + text may be used for contextual actions such as `Add Component`.

## 9. Buttons

### Icon buttons

Use for routine, repeated, spatially constrained editor actions.

### Text buttons

Use only where the label materially improves comprehension.

### Primary actions

Primary text buttons should be rare in dense editor panels and more common in dialogs or explicit workflows.

Avoid turning every action into a full-width text button.

## 10. Numeric Property Editing

Numeric properties must use compact aligned controls.

Preferred pattern:

```text
Transform
────────────────────────
Position
X    [ 0.00 ]
Y    [ 0.00 ]

Rotation
     [ 0.0° ]

Scale
X    [ 1.00 ]
Y    [ 1.00 ]
```

Do not use huge full-width input fields for short values.

Labels and editors should align predictably across sections.

## 11. Slider System

There must be one shared slider system.

All sliders must share:

- track geometry
- thumb geometry
- height
- hover state
- active state
- disabled state
- interaction behavior

Slider width must not unpredictably change between screens.

Do not use giant standalone sliders.

When precision matters, provide a numeric field.

Preferred pattern:

```text
Opacity   ─────────●──── [82%]
```

The slider must not change width based on:

- current value
- label length
- arbitrary parent content
- screen-specific styling

If precise numeric control is meaningful, do not provide only a slider.

## 12. Inspector Design

The inspector should be compact, reusable, and section-based.

Preferred structure:

```text
Transform
────────────────────────
Position
X    [ 0.00 ]
Y    [ 0.00 ]

Rotation
     [ 0.0° ]

Scale
X    [ 1.00 ]
Y    [ 1.00 ]

Sprite
────────────────────────
Texture    [ player.png      … ]
Tint       [■] #FFFFFF
Opacity    ─────────●── [84%]
```

Use collapsible sections where appropriate.

Prefer concise labels.

Prefer:

- `Position`
- `X`
- `Y`

instead of verbose labels such as:

- `Object Position X Coordinate`
- `Object Position Y Coordinate`

## 13. Information Architecture

The main editor should use a persistent desktop-tool shell.

Likely structure:

- Top: main toolbar/navigation
- Left: hierarchy/scene/assets as appropriate
- Center: primary workspace/viewport
- Right: inspector/properties
- Bottom: console/animation/debug/contextual tools

This is not mandatory if the actual Nova_A workflow justifies a better arrangement, but major layout regions must remain predictable.

## 14. Persistent Application Shell

The application shell should remain alive whenever technically reasonable.

Persistent elements may include:

- top navigation/title area
- main toolbar
- left dock
- central workspace container
- inspector dock
- bottom dock

Switching editor sections should replace only the relevant content region rather than destroying and rebuilding the entire editor shell.

During navigation:

- no visible white flash
- no visible black flash
- no blank intermediate frame
- no full-shell disappearance
- no unrelated panel resize
- no random geometry jump

Do not add animation merely to hide architectural flicker.

Fix the actual cause.

## 15. Layout Contract

Major panel geometry must have deliberate defaults.

Suggested starting points:

| Region | Default | Minimum | Maximum |
|---|---:|---:|---:|
| Left dock | 240 px | 180 px | 420 px |
| Inspector | 300 px | 240 px | 460 px |
| Bottom dock | 220 px | 140 px | application-dependent |
| Top toolbar | ~40 px | fixed | fixed |

These values may be adapted to actual framework constraints.

Resizable docks are encouraged where useful.

Rules:

- switching tools must not resize unrelated docks
- property controls must not collapse into unusable widths
- control geometry must not depend on arbitrary label length
- window-size constraints should be handled predictably

## 16. Responsive Desktop Behavior

Nova_A is a desktop editor, not a mobile application.

When space becomes limited, prefer:

- panel scrolling
- collapsible sections
- resizable docks
- text truncation with tooltips
- contextual toolbar simplification

Avoid:

- random input shrinking
- chaotic toolbar wrapping
- extremely narrow property fields
- per-screen emergency sizing hacks

## 17. Card Usage

Do not redesign Nova_A as a collection of cards.

Professional editor surfaces should primarily use:

- panels
- docks
- sections
- tabs
- trees
- lists
- inspectors
- property rows
- toolbars
- menus
- dialogs

Cards should exist only when they have a clear semantic purpose.

## 18. Text Density

Use concise terminology.

Routine operations should use recognizable icons plus tooltips.

Avoid explanatory paragraphs inside normal editor surfaces.

Preferred empty state:

`No object selected`

Avoid verbose instructions unless the workflow genuinely requires them.

## 19. Shared Components

The UI implementation should converge on shared components for:

- design tokens
- typography
- SVG icons
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
- menu
- tooltip
- scrollbar
- divider
- dialog
- popup/modal
- panel header

Individual screens should not implement slightly different versions of the same control.

## 20. Visual QA Checklist

For every significant editor screen, verify:

- no oversized controls
- no inconsistent input heights
- no inconsistent button sizes
- no giant standalone sliders
- no inconsistent slider geometry
- no unnecessary text buttons
- no emoji icons
- no mismatched SVG styles
- no unexplained large empty areas
- no overcrowded sections
- no inconsistent padding
- no inconsistent margins
- no misaligned labels
- no clipped text
- no overlapping controls
- no accidental horizontal scrolling
- no unnecessary scrollbars
- no controls touching panel boundaries
- no duplicated actions without purpose
- no layout jumping
- no navigation flicker
- no temporary blank frames
- no arbitrary component dimensions
- no screen that visibly belongs to a different visual generation

## 21. Definition of UI Completion

UI work is not complete merely because the project builds.

A significant UI task is complete only when:

- functionality still works
- relevant tests pass
- build succeeds
- affected surfaces use shared components
- actual visual output has been inspected where possible
- the result conforms to this specification
- nearby interfaces remain visually consistent
- obsolete legacy styling/components are removed when safe

Visual consistency is part of correctness.

## 22. Implementation contract (2026-09-28)

The editor uses `src/ui/tokens.css` and `src/ui/editor.css` as its single style entry. Shared presentation components live in `src/ui/components`. Native inputs, selects, checkboxes and textareas are also shared primitives: their centralized classes and geometry preserve native model modifiers, browser validation and bubbling events. Wrapping every native element is not required when it would change those contracts.

At 100% scale: command/input height 28 px, standard workflow input 32 px, tree row 24 px, tab 32 px, icon 16 px, numeric field 88 px, standard slider track 128 px. Geometry scales exactly once with the saved UI scale. Spacing is 2/4/8/12/16/24 px. Controls use a 3 px radius; panels and sections are square; dialogs use 6 px. Property rows use the shared 104 px label column and a bounded editor column, switching deliberately to stacked labels in constrained hosts. A scalar slider includes a compact precise value unless the owning specialized canvas already provides it.

Existing light palettes, high contrast, localization, reduced motion, saved dock arrangements and 100–200% scaling remain supported capabilities. The default dark palette follows the restrained semantic colors above. Saved themes change semantic colors, not per-screen geometry. Graph port/category colors, canvas rulers, timeline coordinates, collision matrices and virtual-list offsets are semantic/spatial exceptions; their definitions remain centralized in their existing domain model where appropriate.

Navigation keeps the outgoing usable content until the incoming module is ready. Workspace content has no enter/leave opacity or transform transition. Cached views explicitly suspend visibility-only listeners, previews and measurement work on deactivation. Switching projects remains a disposal boundary. Explicit workspace presets, dock resizing and maximize/focus commands may deliberately change layout; an ordinary subtool change must not resize unrelated regions.

Existing published releases remain immutable. This rebuild changes the development working tree; it does not relabel or overwrite the qualified 26.32 archives.

Compact mode retains its existing user preference and reduces command/input heights to 24 px through central tokens; normal mode remains 28 px. Slider tracks/thumbs scale once, preserve a semantic contrasting track, and retain 128 px track width unless the containing pane is physically narrower. Stacked-label and reduced-motion preferences apply to the shared implementation. Full selected-value tooltips remain available for native dropdowns.
