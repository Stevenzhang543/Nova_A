# Nova_A 26.32 form design

## Reference study

The [Defold editor manual](https://defold.com/manuals/editor/) separates assets, scene, outline, properties and tool output into resizable panes. Its properties pane follows selection; pane borders and visibility controls preserve room for the current work. This informed Nova_A's bounded property fields and consistent label/value columns rather than turning every wide dock into an equally wide input.

The [Defold properties manual](https://defold.com/manuals/properties/) describes numerical drag handles and individually addressable vector components. Nova_A keeps its existing range, expression, stepper and paired-axis behavior, organizing those controls as a compact group. It does not copy Defold engine code, editor assets or numerical behavior. The measurements below are Nova_A design decisions, not measurements claimed from Defold.

## Before and after

The inherited readability layer intentionally assigned 100% width to fields in narrow cards. Other component rules gave numeric drafts and sliders unrestricted flex growth, so maximized docks could stretch a single value across the panel. Several settings, world, network and production cards combined those rules with different fixed control columns. `main.css` also forced every single-line value to centered alignment.

`src/assets/editorForms.css`, loaded after the inherited readability layer, defines one control-sizing system:

| Control | Maximum measure | Alignment |
| --- | --- | --- |
| Ordinary text and selectors | 36 character cells plus 24 px | Start |
| Search | 32 character cells plus 24 px | Start |
| Numbers and numeric expressions | 12 character cells plus 24 px | End |
| Range slider | 24 character cells plus 24 px | Native range behavior |
| Multiline form text | 68 character cells | Start |
| Expression with steppers | Numeric measure plus 64 px | Expression end; buttons preserved |

Every bound also clamps to the containing block. Label/value grids become stacked below 32 em of actual inspector/card width, and the explicit stacked-label preference remains authoritative. Paired axes, sliders with expressions and actions can wrap. Character measures, including the slider measure, grow once with the supported control font scale. Existing control heights, focus indicators, keyboard behavior, commit, undo, validation and persistence paths are retained.

The shared rules cover editor controls, the project manager and top-level teleported dialogs. Canvas and timeline geometry are untouched. ScriptStudio's editing textarea, shader source, automation source, inline visual-graph source and the read-only compatibility document keep their dedicated editing surface widths. These are deliberate exceptions to the form-text measure, because horizontal code space and matching source/gutter geometry are functional requirements.

## Risk review and useful verification

The relevant risks are CSS specificity conflicts, a compounded numeric field losing its stepper room, long translated labels/select options being clipped, narrow docks, enlarged type, teleported dialogs and accidentally resizing a source editor. The visual audit must examine populated forms in docked and maximized hosts, three locales, supported scales, slider/stepper containment and source-editor geometry. Pending-draft/save and history checks are useful because a control becoming unreachable can prevent committing authored values. Engine solver benchmarks and unrelated platform matrices do not test these CSS changes.

The width, alignment and intrinsic flex-basis declarations use `!important` to supersede legacy mandatory full-width, centered-value and higher-specificity fixed-basis rules. No value-binding or runtime logic is changed in this stylesheet. This document records intended behavior; executed visual-audit reports provide verification and its coverage limits.

The first visual pass exposed a legacy `flex: 1` search rule: disabling only its growth left a zero flex basis, collapsing the inspector search to its padding. The shared rule now resets the entire flex shorthand to `0 1 auto`, using the bounded authored width as its basis. Paired numeric groups use their available column while each child remains bounded, avoiding premature wrapping caused by measuring differently sized child fonts in the parent's character cells.

The German 1.5x visual pass found a 693 px ambient-intensity slider. The original `22rem * ui-scale` proposal compounded root-font scaling. Its final bound is `24ch + 24px`, tied directly to the control font and scaled only once.

The populated network screenshots also exposed numeric fields growing vertically in stacked flex labels. A numeric width used as `flex-basis` becomes a height in a column parent. Numeric fields, ranges and numeric-draft wrappers now all use `flex-basis: auto`; their explicit widths retain the intended horizontal measures while existing single-line heights determine their vertical size.

The second visual pass found a more specific inherited responsive-preview numeric rule still winning over the intrinsic flex basis. The shared intrinsic basis is now explicit and mandatory across single-line fields, ranges and numeric wrappers. Presentation-card label captions likewise use an intrinsic basis so their former 12-character column width cannot become an empty vertical region above a stacked field.

Final qualification exposed the profiler annotation input/add pair stretching to 62 px at default scale and 75.5 px at 1.5x. A focused computed-style diagnosis confirmed both siblings inherited the compound flex row's cross-axis height. The explicit `annotation-control` class now uses a two-column grid with centered items and a 6 px gap. A temporary diagnostic prototype measured a 33 px input and a 29 px button before applying the source repair; rebuilt qualification must independently verify that repair without injected styles. The annotation binding and add handler are unchanged.
