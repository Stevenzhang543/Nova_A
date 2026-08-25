# Nova_A 4.7 Animation and Runtime UI

Nova_A 4.7 completes the production animation and runtime UI authoring path while keeping Project Format 2 at schema 29.

## Animation Studio

Choose or create a clip, controller, rig, skin, timeline, or mask before editing controls become active. Clips support property tracks, signal events, method calls validated against Script Studio, audio references, nested clips, custom commands, markers, sprite frames, and owner or explicit entity targets. The dope sheet and curve editor support box selection, copy/paste, snapping, Step/Linear/Cubic interpolation, Auto/Linear/Constant/Free tangents, easing, retime with optional ripple, key reduction, and non-destructive slicing.

Controller assets provide layers, masks, parameters, state subgraphs, transitions, exit times, conditions, blend trees, interruption policies, preview, and live runtime inspection. Runtime sampling covers forward, reverse, looping, nested, event, and command crossings without silently skipping a loop boundary.

Rig assets provide ordered bones, skins with normalized weights, rotation/copy/position constraints, IK chains, attachment sockets, and retarget aliases. Retargeting maps explicit aliases first and safe bone-name aliases second. Missing targets and invalid asset dependencies are reported in Animation Studio and Project Health.

## Runtime UI

UI controls share scene hierarchy selection, Inspector editing, undo history, prefab creation, and asset references. RectTransform supports explicit Responsive or Fixed mode, anchors, pivot, offsets, margins, fill/content/fixed policies, min/max size, aspect rules, device breakpoints, RTL mirroring, z-order, focus links, semantic metadata, and reusable component source/variant metadata. Panel provides row, column, grid, flow, overlay and other containers together with clipping, masks, scrolling, padding, wrapping and ordering.

The UI workspace previews desktop 16:9, laptop 16:10, ultrawide 21:9, desktop 4:3, mobile portrait and mobile landscape presets with DPI and safe areas. Warnings for fixed coordinates, invalid or overlapping breakpoints, min/max conflicts, overflow, clipped text, unsafe areas, missing reusable sources, theme cycles, unused tokens and accessibility issues navigate directly to the entity.

Standard editor typography remains separate from runtime font assets and theme typography tokens.

## Runtime input and accessibility

Text controls can display a bound action automatically for keyboard, mouse, gamepad or touch. Gamepad prompts adapt to Xbox, PlayStation, Nintendo and generic layouts. The runtime semantic tree exposes role, name, description, state, value, focus and disabled state where the host webview supports accessibility nodes.

Accessibility settings include keyboard/gamepad navigation, focus announcements and rings, screen-reader metadata, text scale, high contrast, reduced motion, minimum target size, subtitles, sound captions, caption background and caption scale. The automatic checker is available in UI preview, Project Health and Build validation.

## Known limitations

- Nova_A exposes semantic browser/webview nodes; spoken screen-reader behavior and voices are controlled by the operating system and webview.
- Fixed mode remains supported for deliberate pixel-authored interfaces but is warned when coordinates are fixed without an explicit Fixed declaration.
- Retargeting is 2D and alias-based; it does not infer anatomy from arbitrary unlabelled skeletons.
- Audio decoding and exact font glyph coverage depend on included assets and target-platform codecs/fonts.

