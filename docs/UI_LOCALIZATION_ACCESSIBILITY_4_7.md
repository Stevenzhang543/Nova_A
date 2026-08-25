# Nova_A 4.7 UI, Localization, Themes, and Accessibility

## Themes

Theme documents support inherited color, typography, spacing, radius, state, icon, sound and animation tokens; named variants; component classes; and normal, hovered, pressed, disabled and focused states. The UI workspace previews states, compares two themes, reports unused tokens, and detects missing parents or inheritance cycles. UI sounds belong to theme tokens, component overrides, or the Audio workspace rather than unrelated global settings.

## Localization

Localization uses stable string keys extracted from UI components and `localize`/`tr` script calls. Each locale table records direction, display/native metadata, fallback locale, font fallback assets/families, context and string or plural/select values. CSV and GNU PO import/export are available from the table toolbar. Project settings select source, preview, fallback chain, build locales, pseudolocalization mode/expansion, decimal/percent/currency formatting, currency code, date style and time zone.

Diagnostics report missing build-locale keys, unstable key syntax, plural entries without `other`, replacement glyphs and unbalanced bidirectional isolates. Test English, German, Chinese and pseudolocalized output plus Arabic/RTL, emoji and combining marks before shipping.

## Accessibility and focus

Every focusable control should have a semantic role and accessible label. Description, state, value, live-region priority, reading order, explicit directional links, skip-navigation and screen-reader-hidden state can be authored on RectTransform. Focus traversal can be inspected and each issue navigates back to the source entity. Runtime keyboard, mouse, gamepad and touch prompts are generated from the project Input Map.

Build validation includes selected locales and accessibility findings. Project Health aggregates the same production diagnostics, and Profiler exposes explicit UI and animation frame budgets.

## Migration

Project Format 2 remains schema 29. Existing RectTransform and Text components load with responsive layout, RTL mirroring, zero z-order, Word wrap, clipped overflow and no input-prompt/caption action unless a value already exists. Existing global UI audio settings remain readable for compatibility, but new authoring uses theme/component/Audio locations.

