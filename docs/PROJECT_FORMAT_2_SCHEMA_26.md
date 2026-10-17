# Project Format 2 — schema 26

Schema 26 is the additive Nova_A 3.6 presentation-layer migration. It preserves every field from schemas 5–25 and stores the new UI, input, localization, accessibility, UI-audio, theme-variant, and animation-clip contracts.

## Additive data

- Canvas components store DPI and locale preview metadata plus the active theme variant.
- RectTransform stores anchor ranges, offsets, preferred/minimum/maximum sizes, reading order, skip-navigation, and accessibility name/description/role/state/value/live metadata.
- Panel stores the complete layout-container choice, alignment/justification, modal/popup/tooltip behavior, drag/drop group, scrolling, clipping, and visibility.
- Button stores optional hover/focus/press UI-audio references.
- Input bindings store device identity, deadzone, threshold, inversion, response curve, modifiers, and chords for keyboard, physical-key, mouse, gamepad, touch, and gesture devices.
- Presentation settings store pseudolocalization mode/expansion, runtime high contrast/text scale/minimum target size, and project UI-audio references.
- Animation clips use document version 4 for playback speed, onion skin, easing, markers, and method/audio/nested-animation tracks. Existing clip documents normalize without data loss.

## Migration and compatibility

Opening schemas 5–25 creates the usual pre-migration backup, previews the migration, fills only missing defaults, validates the complete result in memory, then replaces the session atomically. Existing text, scripts, physics, assets, animation tracks, component data, input bindings, collision masks, and unknown compatible fields are preserved. A schema newer than 26 opens only in the non-mutating compatibility viewer.

Older Nova_A releases cannot safely edit schema 26. Use the retained pre-migration project when returning to an older editor.
