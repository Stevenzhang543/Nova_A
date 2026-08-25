# Nova_A 4.7.0 release notes

Nova_A 4.7 completes production animation and runtime UI authoring while retaining Project Format 2 schema 29 and the stable 4.x public contracts.

## Added

- Eight animation track kinds, interpolation, retime/ripple/reduction/slicing, state/runtime inspection, 2D rigs, attachments, retargeting, compression and sampling validation.
- Responsive UI layout, six device presets, safe areas, breakpoints, reusable variants, direct validation navigation and runtime/editor font separation.
- Full theme tokens with inheritance/compare/unused diagnostics.
- CSV/PO localization, plural/fallback/number/date policies, pseudolocalization, RTL/Bidi and locale font fallback.
- Semantic accessibility, focus, contrast, text-scale, reduced-motion, caption/subtitle and automatic input-modality workflows.
- Animation/UI budgets in Profiler and Project Health, plus localization/accessibility Build gates.

## Compatibility

No feature or animation was removed. Presentation's redundant page heading and misleading no-selection animation controls were replaced with contextual navigation and a clear empty state. Legacy global UI-audio data remains readable for compatibility, while new authoring uses component/theme/Audio ownership. Fixed-pixel layouts remain supported only when explicitly declared Fixed.

## Qualification

Static audit: passed. Deterministic verification: passed. Browser layout: passed. Native screen-reader speech, Firefox/WebKit, and clean-machine comparisons are explicitly retained as external gates.
