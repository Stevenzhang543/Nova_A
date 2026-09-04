# Nova_A 26.05 production-media layout audit

The 26.05 layout audit retains the all-panel containment contract and adds the complete Rendering Studio Production surface in English, German and Simplified Chinese.

## Structure

- Production is a first-class section beside Lighting, Materials, Shaders, Visual Graph, Particles, Post, Diagnostics and Quality; no retained section is removed or hidden.
- The readiness summary, Balanced/Low-end actions, six subsystem checks, texture residency settings, capture settings/progress, frame downloads and issues use fluid `minmax(0, 1fr)` grids.
- At widths below 760 CSS pixels, paired cards and every form collapse to one column. Long file names, diagnostic fixes, German compounds and Chinese labels wrap inside their owner.
- The panel body retains its own scroll region. No new fixed root width, viewport-sized child or forced whole-window horizontal scrollbar is introduced.
- Primary actions remain visible as native buttons and keep the shared focus ring, touch target, theme, high-contrast and reduced-motion behavior.

## Localization and accessibility

Every public label and state has EN/DE/ZH text: profile, status, checklist, texture budget, idle frames, upload budget, preload margin, capture rate, audio sample rate, maximum frames, memory, UI inclusion, start/stop/clear/download and subsystem fixes. Status uses words and symbols in addition to color. Each checklist row is a keyboard-reachable button that moves to its owning workflow or provides the exact navigation hint.

Numeric inputs have visible labels, bounded values and units. Capture progress reports frame and memory ownership in text. Download links are named by frame number and media time. Disabled actions remain readable and explain their unavailable state through the adjacent status.

## Required view matrix

Browser evidence covers 1024×640, 1024×768, 1366×768, 1920×1080 and 2560×1440 at 100%, 150% and 200% UI scale, across EN/DE/ZH. Source-wide containment audits still enumerate every Vue panel. Light, dark, high contrast, reduced motion and keyboard-only paths remain inherited release requirements.

Independent screen-reader/hardware review and human visual inspection on every OS text renderer remain external gates; local automation does not claim them.
