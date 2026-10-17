# Nova_A 26.04 Assets workspace and localization layout audit

The 26.04 surface audit covers every retained Vue panel plus the Assets browser's deterministic thumbnails and the Inspector's Overview, Dependencies, Pipeline, Slices, Resource and Animation tabs.

## Layout rules

- Every flex/grid child can shrink with `min-width: 0`; paths and generated identifiers wrap or ellipsize inside their owner.
- The asset grid retains the existing virtual window and independent scrolling. Image previews use `contain`; generated content thumbnails use `cover` and a readable glass icon.
- Context tabs use a responsive auto-fit grid. Dependency lanes are three columns at normal width and collapse to Selected, Dependents, Dependencies on narrow surfaces.
- Summary cards and resource forms collapse to one column below 760 CSS pixels. Resource JSON editors retain vertical resize and an independent maximum-height preview.
- No new component uses a fixed root width. Popovers stay bounded to the viewport. The selected asset remains available while the content pane scrolls independently.
- Controls inherit the semantic editor type scale, visible focus ring, reduced-motion behavior, theme tokens and contrast tokens. No animation or existing panel was removed.

## Localization checks

English, German and Simplified Chinese provide release labels and names for dependency, pipeline, cycle, missing-reference, production-profile and Resource-variant controls. Labels may wrap; graph paths remain language-independent. At 100–200% UI scale, translated labels do not force the Inspector or bottom panel beyond the window.

The content-localization source marker is “Asset dependency graph” / “Asset-Abhängigkeitsgraph” / “资源依赖关系图”; automated source checks cover all three dictionaries. Browser evidence requires the localized Design workspace marker and traverses the retained all-workspace matrix, while the generic all-panel source/layout audit enumerates every Vue component and the v26.04 interaction audit verifies the Assets-specific routes.

## Keyboard and accessibility

All graph nodes are native buttons. Missing nodes are disabled, selected nodes have a stable selected state, and clicking a present node changes the canonical Asset Database selection. Tabs, variant controls, save actions, searches, filters and repair actions remain keyboard reachable. Status does not rely on color alone: direction arrows, labels, check/attention glyphs, cycle text and missing counts remain visible.

## External evidence

Local browser qualification is not a substitute for independent screen-reader/hardware testing or manual inspection on every OS/text-renderer combination. Those gates remain external and are named in the release evidence.
