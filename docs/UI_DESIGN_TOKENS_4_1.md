# Nova_A 4.1 UI design-token specification

This document is the stable vocabulary for editor chrome. The executable source of truth is `src/assets/main.css`; component styles consume these variables and may not invent a second semantic meaning for the same state.

## Typography

| Role | Token | Default |
| --- | --- | --- |
| UI body | `--font-ui`, `--type-body`, `--line-body` | Nunito Sans Variable with Noto Sans SC Variable fallback; 13 px / 1.45 |
| Caption and metadata | `--type-caption`, `--line-caption` | 11 px / 1.35 |
| Labels and controls | `--type-label`, `--line-label` | 12 px / 1.3 |
| Section title | `--type-section`, `--line-section` | 15 px / 1.3 |
| Dialog/title | `--type-title`, `--line-title` | 18 px / 1.25 |
| Code and telemetry | `--font-code` | JetBrains Mono Variable with Noto Sans SC fallback |

Normal UI uses 400; controls use 600; strong headings use a real variable-font weight. Text must not be bitmap-scaled. UI scale is clamped to 100–200%; Compact changes spacing and control height, never the readable type floor.

## Geometry and rhythm

- Spacing: `--space-1` through `--space-8` form a 4 px rhythm from 4 to 32 px.
- Controls: `--control-height-compact` 28 px, `--control-height-default` 34 px, `--control-height-large` 40 px.
- Radius: `--radius-control-small`, `--radius-control`, `--radius-panel`, `--radius-dialog`.
- Panel minimums: hierarchy 160 px, inspector 252 px, transient bottom 120 px, application window 1024×640.
- Elevation: surface tokens identify hierarchy; `--shadow-lg` is reserved for dialogs/floating docks.

## Color and interaction

Background and text use `--bg-*`, `--surface-*`, `--text-*`, and `--border-*`. `--accent` identifies the active action and selected state. `--success`, `--warning`, and `--danger` are semantic: danger red is reserved for errors, destructive actions, and audio clipping. Audio ranges inherit the normal blue accent.

`--focus-ring` supplies the keyboard focus outline, `--selection-bg` and `--selection-text` supply text selection, `--drag-target` marks docking destinations, and `--disabled-opacity` is paired with a disabled reason. A color change may not be the sole state signal; selected buttons also expose `aria-pressed` or an equivalent semantic state.

## Icons, labels, and hierarchy

Icons are text/vector/CSS-native so they remain sharp at every DPI. Every icon-only stable control receives an accessible name and tooltip. Primary, regular, quiet, and destructive buttons are distinguished by their semantic class—not by one-off colors. Sentence-style capitalization is used for user-facing actions.

## Enforcement

The v4.1 static audit checks the token families and font imports. Browser qualification checks clipping, overlap, vertical writing, whole-application overflow, console failures, mixed-language layouts, and required shell bounds. The stable-control registry adds machine-readable IDs and disabled reasons after each Vue render. New stable editor controls must enter that inventory and the command palette.
