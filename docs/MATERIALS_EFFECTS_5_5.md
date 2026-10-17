# Materials, shaders and post-processing in Nova_A 5.5

## Visual material workflow

Open **Rendering → Visual material graph**, choose or create a material asset, and select a Sprite, UI or Light target. Add nodes from the searchable palette, select a node, then connect each named input to another node. Color, gradient, palette, outline, dissolve, distortion, mask, arithmetic and blend nodes compile to deterministic GLSL; the generated source is inspectable but is never treated as a second editable truth.

The capability card previews WebGL2 or Canvas2D behavior before saving. WebGL2 evaluates the full generated shader. Canvas2D preserves tint, gradient and palette results where its API can do so predictably; mask, outline, dissolve and distortion are identified as explicit fallbacks instead of silently pretending to match. A graph may have one Output, no cycles and at most 256 nodes/512 edges. Invalid graphs cannot be saved.

## Layered 2D materials

Use **Layered 2D effects** when a linear stack is clearer than a graph. A material supports up to 16 enabled Tint, Mask, Gradient, Palette, Outline, Dissolve or Distortion layers. Select a row to edit colors, texture, strength, threshold and softness; choose Alpha, Additive, Multiply or Screen; drag opacity or reorder with the arrow buttons. The saved order is the render order. Mask textures use stable `asset://UUID` references.

Material format version 3 adds `target`, `graph` and `layers` without changing Project Format 2/schema 29. Older material assets normalize with an empty layer stack and no graph. A shader compile failure is isolated to that material, records an actionable fallback event and renders the safe base material; it does not stop the scene.

## Post-process presets and camera volumes

Open **Rendering → Post processing**. Enable processing, select a preset, then adjust exposure, contrast, saturation, vignette, bloom and blur. Duplicate creates an independent preset. A camera volume is a bounded world-space rectangle referencing a preset; priority resolves overlapping volumes and blend distance softens entry. The active game/editor camera position selects the live values before the render frame begins.

WebGL2 renders post effects through the scene framebuffer even when no custom post material is assigned. Canvas2D applies its documented filter/overlay approximation. The cost estimate reports passes and an estimated 1080p GPU time; it is a planning estimate, not measured hardware evidence.

## Atlas, import and frame diagnostics

**Rendering → Diagnostics** shows actual atlas-page and source-image thumbnails, page utilization, import dimensions/profile/filter/color space, texture memory, draw calls, batch breaks, overdraw and render-graph passes. Recommendations compare measured counters with project budgets and explain the corrective action. Use a frame capture to compare output before/after an optimization; pixel-art and high-DPI references are included with the release evidence.

## Recovery checklist

1. If a graph will not save, fix its Output/cycle diagnostic.
2. If Canvas2D differs, inspect the capability preview and choose WebGL2 or remove the listed fallback effect.
3. If one material is magenta/base-colored, open its shader diagnostic; the rest of the frame remains operational.
4. If batching breaks, align atlas, material, filter and blend mode for sprites drawn together.
5. If post-processing costs too much, reduce bloom/blur passes or use a lower-cost preset/volume.

