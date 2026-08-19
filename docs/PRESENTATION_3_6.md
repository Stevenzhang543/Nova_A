# Nova_A 3.6 presentation workflow

The **UI** workspace now owns responsive UI, themes, UI-specific audio references, localization, and game-level accessibility. Project-wide audio buses, effects, snapshots, sends, ducking, waveform/import options, and voice diagnostics live in the separate **Audio** bottom-panel system.

## UI and themes

Canvas reference resolution, DPI, safe-area insets, locale preview and theme variant drive the runtime renderer. RectTransform provides anchor presets and explicit anchor ranges, offsets, size policies, preferred/minimum/maximum sizes, aspect constraints and responsive breakpoints. Panel containers provide Row, Column, Grid, Flow, Overlay, Center, Margin, Aspect and Split behavior. Panels may clip/mask/scroll, or operate as modal, popup, tooltip, drag source and compatible drop target.

Themes inherit from a parent and expose reusable color, spacing, typography and radius tokens, normal/hovered/pressed/disabled/focused states, and named variants. Images retain nine-patch borders. Responsive Preview covers common phone, tablet, desktop and ultrawide sizes with independent DPI, safe-area and RTL controls.

## Input

Project Settings → Input Map is searchable and device-filterable. Bindings cover logical and physical keys, mouse buttons/wheel/motion, gamepad buttons/axes, touch and gesture input. Each binding may specify device identity/index, deadzone, threshold, inversion, response curve, modifiers and a chord. Duplicate action creates an independent copy. Conflicts identify both action/binding owners. Runtime remapping, hot-plug identity and record/replay tests use the same normalized map.

## Localization and accessibility

Localization tables include locale/fallback/direction metadata, context, strings or plural/select maps and font fallbacks. Import/export uses CSV columns `key,context,value`. Extraction discovers UI `localizationKey` values and `localize`/`tr` script calls; the missing report links every missing key to its source. Accented, expanded and BiDi pseudolocalization and RTL preview expose clipping and direction bugs before export.

Game accessibility metadata covers name, description, role, state, value, live-region policy, reading order and focus links. Runtime options connect keyboard/gamepad navigation, screen-reader metadata, focus announcements/rings, reduced UI motion, high contrast, scalable text and minimum targets. The audit links missing labels, unreachable controls, contrast, order, invalid focus targets and small controls back to the entity property. Editor accessibility remains an editor preference; game accessibility is serialized with the project.

## Animation

Animation keeps the dope sheet, curve editor, Inspector key insertion, snapping, tangents, event and sprite-frame tracks, animator layers/parameters/conditions/transitions/blend trees/live preview, timelines, rigs, skins, weights, IK and constraints. Clip version 4 adds per-key easing, markers, playback speed, onion skin, and method/audio/nested-animation command tracks. Runtime dispatch and animation length use the same normalized clip.
