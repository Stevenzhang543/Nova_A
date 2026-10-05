# Nova_A UI Visual V3 Specification

Active26.37 refinement: the latest user Comfortable requirements replace the earlier compact geometry. Preserve the successful information hierarchy and major workflows.

## Character
Soft, spacious, fluid, tactile, calm, refined, coherent and professional. Primary reading/control type is16px; a comfortable desktop tool is not measured by the maximum number of properties on one screen.

Keep supplied light/dark Nova marks and existing palettes. Use deliberate text hierarchy, whitespace, surface contrast and soft separators. The launcher may be more expressive than the persistent workspace.

## Shared sizes
UI_SPEC.md and src/ui/tokens.css own the dimensions:44px controls,40px tree/list rows,56px headers,16px labels/values,14px help,18px panel titles,22px section headings,34px launcher heading and15px monospace.

All are logical CSS units. Device DPI is handled by the browser; saved UI scale applies exactly once. No whole-app transform or zoom substitutes for real layout.

## Spacing
Increase all five relationships together:
-12px stacked label-to-control;
-20px between fields;
-28px between sections;
-16px inline label/control and title/content;
-20px panel inset and24px dialog inset.

Inputs use24px line boxes,9px vertical and16px horizontal padding plus1px borders in a44px total height. Related field pairs have12px gaps. Nested surfaces need one inset owner rather than repeated padding.

Scrolling and meaningful folding are acceptable. Do not restore old small type to regain previous single-screen field counts.

## Radius and contours
Use8px list-state backgrounds,12px controls/tabs,16px main panel contours,20px floating surfaces and24px dialogs/launcher accents. A shared8px gutter exposes dock radii without changing the information hierarchy.

Internal property sections remain grouped regions, not cards/pills per field. Clip descendant backgrounds deliberately; keep focus outlines, scrollbars, popovers and drag previews visible.

## Surfaces and decoration
Use existing app/dock/panel/header/raised/hover/selection/floating/overlay semantic surfaces. De-emphasize repeated borders through whitespace and mild luminance differences. Reserve shadows for true elevation.

Retain restrained Nova grid/node/orbit motifs behind content. Decorative elements cannot block input, compete with the viewport or simulate controls. No permanent blur on text/property surfaces. Temporary layers may use selective material blur with opaque/high-contrast/reduced-motion fallbacks.

## Layout
Use readable Inspector/hierarchy widths, wrapping toolbars and accessible overflow surfaces. Never clip a core command silently. Content should scroll and preserve user state rather than shrink into legacy fixed heights.

Keep persistent shell/content alive, deliberate responsive constraints and directly controlled resize/drag geometry. Motion must not conceal architectural flicker.

## Motion
The existing shared Snappy/Smooth/Elastic system owns state-feedback, presence, selection, disclosure and drag-release behavior. See MOTION_SYSTEM_SPEC.md. Normal motion is enabled; Reduced Motion retains state/focus feedback with fewer translations and no strong overshoot.

No text deformation during input, pointer-follow lag, logical overshoot or perpetual decorative simulation. Each main real panel and control category requires integration evidence.

## Acceptance
Compare the same populated project/selected object at matching window, UI scale and DPR. Check launcher, shell, hierarchy, Inspector, Assets, Settings, Dialog and all present specialized editors.

Verify type/line-height/control math, label/field/section spacing, readable translations, scroll ownership, exposed radii, clipped corners, focus outlines and narrow-window recovery. Inspect dynamic state changes as well as settled screenshots. Document actual tested and unverified conditions; build success alone is insufficient.
