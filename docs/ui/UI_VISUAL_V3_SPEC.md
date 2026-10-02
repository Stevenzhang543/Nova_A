# Nova_A UI Visual V3 Specification

## Purpose
This document evolves the existing Nova_A editor without discarding its successful information hierarchy.

The current UI is already clean, structured, readable, and appropriately minimal.
V3 should make the same interface feel less rigid, less cramped, more tactile, more spacious, and more visually authored.

## Design keywords
Primary:
- Soft
- Spacious
- Fluid
- Tactile
- Calm
- Refined
- Coherent

Secondary:
- Technical
- Compact
- Precise
- Confident
- Contemporary

Avoid:
- childish styling
- bubbles everywhere
- exaggerated glassmorphism
- excessive gradients
- excessive transparency
- neon
- enormous spacing
- mobile-first proportions
- decoration without function

## Core principle
Preserve hierarchy, soften geometry.

## Radius system
Create semantic radius tokens rather than hardcoded values.

Suggested starting range:
- radius.xs: 4
- radius.sm: 6
- radius.md: 9
- radius.lg: 12
- radius.xl: 16
- radius.pill: only where semantically appropriate

Use small radii for dense controls, larger radii for floating/dialog/launch surfaces.
Do not round every dense row independently.

## Spacing system
Suggested baseline:
- 2 micro
- 4 very tight
- 6 tight
- 8 compact
- 12 normal
- 16 comfortable
- 20 section
- 24 large section
- 32 major composition
- 40/48 launch-page only where justified

Increase whitespace especially in:
- panel headers
- section headings
- launch page
- empty states
- inspector group boundaries
- tab-to-content boundaries
- toolbar group separators
- dialogs

Do not blindly increase every row height.

## Text spacing
Text should never appear trapped against borders, icons, neighboring labels, or panel edges.
Define consistent:
- horizontal content padding
- vertical content padding
- icon-to-label gap
- label-to-value gap
- section-title spacing

## Surface system
Define layered surfaces:
- app background
- dock background
- panel surface
- raised surface
- hover surface
- selected surface
- floating surface
- modal/overlay surface

Keep the established palette unless there is a reason to change it.
Use subtle luminance/tint differences rather than thick borders everywhere.

## Accent blocks and decoration
Suitable uses:
- launch-page hero
- selected project accent
- subtle section marker
- active tool tint
- status chips
- restrained background motifs

Possible motifs:
- soft abstract geometry
- grid/particle motifs
- node/graph-inspired diagrams
- subtle gradient haze
- line patterns

Rules:
- low opacity
- never obscure text
- never compete with the viewport
- never look interactive if they are not
- use one coherent motif across the product

## Borders and separators
Reduce the "box inside box inside box" feeling.
Prefer spacing, surface contrast, subtle 1px separators, and selective strokes.

## Shadows
Use shadows only for actual elevation:
- menus
- popovers
- dragged objects
- floating panels
- dialogs

Docked panels should not look like floating cards.

## Inputs
Inputs should be softer and more comfortable without becoming large.
Requirements:
- consistent radius
- comfortable inner padding
- clear focus state
- clear disabled state
- stable height
- readable label gap
- no cramped text

Numeric fields remain compact.

## Buttons
Icon buttons retain compact editor geometry, but gain polished hover/press/focus states.
Primary text actions may use clearer accent treatment and comfortable horizontal padding.
Pressed feedback may include tiny compression or depth response if rendering stays crisp.

## Panels
Panel anatomy:
- header
- header controls
- content inset
- section rhythm
- footer/status area where applicable

Increase content breathing room.
Avoid turning docked panels into disconnected rounded cards.

## Tabs
Possible treatment:
- subtle animated active indicator
- rounded active background
- balanced horizontal padding
- smooth state transition

Avoid excessive pill styling.

## Lists and trees
Keep hierarchy views efficient.
Improve:
- hover
- selected state
- indentation rhythm
- icon spacing
- rename field spacing
- drag target indicators

Do not increase row height so much that density becomes poor.

## Inspector
Use:
- better section spacing
- clearer section headers
- softer control geometry
- consistent label column
- comfortable property-row gap
- clear component boundaries

Do not wrap every property in a card.

## Launch / welcome screen
Evolve from thin text into an intentionally composed entry experience.

Include as appropriate:
- Nova_A identity/logo/mark
- concise welcome/hero area
- Create Project
- Open Project
- Recent Projects
- optional templates
- subtle decorative motif
- version/status info
- restrained dynamic background/accent

Avoid marketing-site layout and excessive animation.

## Color usage
Keep the neutral dark base.
Use accent color for:
- selection
- active tools
- primary actions
- state
- sparse decorative identity

Avoid giving every panel a different color.

## Definition of success
V3 succeeds when:
- current clarity is preserved
- text no longer feels cramped
- major surfaces breathe
- UI feels less mechanically rectangular
- controls feel tactile
- visual interest exists without distraction
- launch screen feels intentionally designed
- editor remains professional after hours of use

## 26.35 applied geometry

Central tokens now define 4/6/9/12/16 px radii, control 6 px, floating 9 px, dialog 12 px and launch accent 16 px. Header/group insets use 12 px; dialog body 16 px and empty-state space 24 px. Semantic larger steps support launcher composition. The existing 28 px command, 24 px compact command/tree row, 88 px numeric field and 128 px slider retain their bounded scaled geometry. Do not substitute these with full-panel stretched fields.

Surfaces share app/dock/panel/header/floating/overlay roles, softer separators and restrained floating shadow. Docks remain square and adjoining. The inert Nova mark and node motif appear only in welcome composition; no continuous idle decoration is introduced. Large-text project labels stay whole and wrap at the control boundary. Actual all-panel route captures and scaled/translated theme checks are recorded separately from functional authoring acceptance.

Hierarchy containment follows the dock's actual font-relative width. Narrow hosts use the shared SVG overflow menu for scene/navigation and all four object actions, instead of reducing names to zero width. Search stays bounded, full names and IDs remain discoverable, and virtual rows retain their existing scaled height. Reserve breadcrumb geometry independently of selection so native drag sources do not move when selected.
