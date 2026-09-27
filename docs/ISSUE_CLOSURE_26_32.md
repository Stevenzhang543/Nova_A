# Nova_A 26.32 GUI scope and findings

## Source ownership and consequences

The Vue editor enters through `src/main.ts`, while the exported player has a separate entry. The new `editorStudio.css` and `editorForms.css` are imported only by the editor. They change visual hierarchy, sizing, alignment and wrapping. They do not change project schemas, runtime physics, game rendering, validation, history or export serialization.

Control markup changes in the workspace/playback/bottom panel/context rail/Manage components retain existing event handlers, enabled states and translated accessible names. Copied SVG geometry is decorative inside the named control. Management categories use one horizontal navigation strip instead of a second vertical navigation column. The compact bottom selector remains available on narrow hosts.

## Established problems addressed

Unbounded flex growth and mandatory 100% field widths produced unnecessarily long textboxes and sliders in wide/maximized panels. Shared measures now cap ordinary text, numeric expressions, search, sliders and multiline form text, while clamping to the available host width. Compound numeric fields retain steppers, values and error space; labels stack before fields become unreadable. Dedicated code editors are exceptions because gutter/source geometry is functional.

The previous shared centered alignment and oversized rounded chrome made dense forms harder to scan. The editor now uses start-aligned prose/selection controls, end-aligned numbers, flatter sections and compact separators. The theme palettes, font scaling, explicit stacked-label option and animations remain available. Touch controls retain larger minimums through coarse-pointer styling.

## Verification boundary

The first screenshot sweep exposed three shared sizing regressions during implementation: zero flex basis collapsed searches; width-valued flex bases produced tall boxes inside column labels; multiplying a rem slider measure by UI scale compounded scaling. These were corrected with intrinsic flex bases and a once-scaled character measure. A more specific inherited UI-preview rule required the intrinsic basis to take precedence explicitly. Visual review also corrected inherited 200% Manage grid rules, split Ecosystem tab words, Event Sheet identifier collisions, and letter-wrapped folder paths. Folder rows now display leaf names/indentation with full-path title and accessible names; their selection/drop targets remain the original full paths. Finally, inherited scaled toolbar rules incorrectly used the row height as the playback strip's horizontal flex basis, hiding Play/Stop beyond adjacent controls or the viewport. The playback strip now reserves its intrinsic width while the workspace area takes the remaining space.

The first frozen candidate exposed one remaining compound-row defect: the profiler annotation field and add button stretched to 62 px, or 75.5 px with enlarged German text. Its dedicated input/action row now uses an aligned two-column grid rather than cross-axis flex stretching. This correction changes only that row's layout; annotation entry and submission retain their existing bindings.

Current visual reports identify each actual route, viewport, visible control measurement and screenshot. The suite covers available workspaces and bottom panels, nested management categories, populated tilemap/world/network fixtures, common dialogs, disclosures, enlarged German text, Chinese text, all five palettes, and a landscape touch flow. It also checks resize/focus/edit/undo/redo/downloaded save. Screenshots are reviewable evidence; geometry assertions alone are not a substitute for visual review.

The full static Vue inventory includes conditional branches not mounted in those routes. Arbitrary third-party plugins, device services and every error-state combination are not certified. No zero-defect, all-source semantic review, hosted-CI or physical-device claim is made.

Final release acceptance requires fresh executed gates bound to a source snapshot, actual current binaries, the exact eleven artifacts and archive/hash verification. Older reports remain historical. Unchanged long-running performance, soak and unrelated platform/security matrices are omitted to keep the audit tied to this GUI work.
