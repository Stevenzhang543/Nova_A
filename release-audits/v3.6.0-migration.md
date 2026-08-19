# Migrating to Nova_A 3.6.0

Nova_A 3.6.0 upgrades Project Format 2 to schema 26. Opening schemas 5–25 first previews the ordered migration, keeps the original backup, normalizes only missing presentation defaults, validates in memory, and atomically replaces the editor session. A newer schema remains read-only.

Existing fixed-position UI is preserved. Select its Canvas and RectTransform components to opt into anchor ranges, offsets, safe areas, DPI preview, and container participation. Existing `row`, `column`, and `grid` values normalize to the current named layouts without changing their intended direction.

Legacy localization strings remain readable. Move reusable text into a structured table to gain contexts, plurals, fallbacks, CSV, extraction, missing reports, pseudo modes, font fallback, and RTL. Existing input bindings gain neutral identity/deadzone/threshold/curve/modifier defaults; their original code, scale, vector, and player slot remain unchanged.

Accessibility settings now affect game UI at runtime. Editor accessibility remains a separate preference. Review the source-linked audit after migration because old controls may not have labels, roles, focusability, reading order, or a 44-pixel target.

Older Nova_A releases must edit the retained pre-migration backup, not the schema-26 file.
