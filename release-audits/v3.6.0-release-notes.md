# Nova_A 3.6.0 release notes

Nova_A 3.6.0 completes the presentation layer without removing the v3.5 Rhai API v1, v3.4 physics, animation, rendering, authoring, or editor workflows. It replaces scattered presentation controls with coherent UI and Audio ownership and advances Project Format 2 to additive schema 26.

## Responsive UI and themes

- RectTransform now supports anchor ranges, offsets, minimum/preferred/maximum sizing, aspect ratio, safe areas, size flags, reading order, skip navigation, and complete accessible metadata.
- Panel supports Row, Column, Grid, Flow, Overlay, Center, Margin, Aspect, and Split layouts, plus scroll, clipping, modal, popup, tooltip, drag, and drop behavior.
- Phone, tablet, desktop, and ultrawide previews exercise resolution, aspect, DPI, safe area, locale, and RTL without changing the game window.
- UI scenes, nine-patch styling, typography/spacing/color tokens, inherited themes, style states, and theme variants remain reusable. UI sound references live in UI; project buses and mixing live in Audio.

## Input, localization, and accessibility

- Input Map supports logical/physical keys, mouse buttons/wheel/motion, gamepad buttons/axes, touch, and gestures. Bindings persist device identity, dead zone, threshold, inversion, response curve, modifiers, and chords.
- Search, device filters, compact rows, action duplication, conflict detection, controller hot-plug, runtime rebinding, and input recording/replay are connected to the runtime.
- Structured localization tables support CSV, context, plural forms, fallback locales, metadata, font fallback, UI/Rhai extraction, missing-string reports, accented/expanded/BiDi pseudolocalization, and RTL preview.
- Runtime UI exposes accessible name, description, role, state, value, live-region, focus/read order, keyboard/gamepad navigation, high contrast, reduced motion, text scaling, and minimum target sizing. The audit links each finding to entity/component/property source data.

## Animation

The existing dope sheet, curve editor, Inspector key insertion, snapping, tangents, looping, Animator transitions/blends/live debug, sprite frames/onion skin, and skeleton/skin/IK/constraint tools remain. Schema 26 adds playback speed, easing, markers, method/audio/nested-animation command tracks, and reusable clip-library support.

## Compatibility and qualification

Schema 26 accepts and migrates schemas 5–25 after backup and preview. The release includes nine presentation reference projects and machine-readable input, localization, accessibility, animation, layout, build, platform, SBOM, stability, and known-issue evidence. No S0 or S1 defect is open in the generated release audit.

The verified release run passed 123 Rust tests, warning-free workspace Clippy, Vue/TypeScript checking, optimized WebAssembly/Vite production builds, the 17/17 retained Rhai workflow audit, the 15/15 v3.6 presentation audit, a 500-cycle stability smoke, and 273 multilingual/responsive browser-layout states with nine screenshots.

Tier-1 web accessibility uses DOM/ARIA hooks. Native operating-system accessibility bridges, Linux/macOS clean-machine installers, code signing, and a 24-hour wall-clock soak remain explicit external qualification boundaries. Tauri also warns that its optional updater bundle-type marker is absent; Nova_A 3.6 does not configure or advertise the updater plugin, and the portable/MSI/NSIS outputs complete normally.
