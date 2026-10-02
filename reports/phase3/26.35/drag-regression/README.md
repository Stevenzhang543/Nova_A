# Native hierarchy drag regression evidence

This is development diagnosis, not release qualification. The original probe's `status: passed` means its read-only observations completed; it contains no acceptance checks, and `qualifiedRelease` is null.

Before the correction, actual native dragging of an unselected name or shape icon kept the same connected source DOM node, and `dragstart` was not prevented. Selection inserted breadcrumbs and moved the row from Y292 to Y321 during `dragstart`; the browser immediately ended the gesture before drag interception. Selecting the source with an ordinary click first produced stable Y321 coordinates and a successful native drag. The preserved PNG shows that selected-source diagnostic, not proof that the unselected case worked.

The correction reserves the existing breadcrumb navigation band, with an empty navigation hidden and inert. Final acceptance belongs to the fresh `v26.35-motion-user.json` release gate, which exercises actual unselected icon and name gestures, source connection and geometry, cancellation, reparenting, and reorder/save results.

The after development probe records successful real native interception for both unselected sources, with source Y329 unchanged. The separate long-label development probe passes two checks at 100% and 200% interface scale: the breadcrumb band and hierarchy top remain fixed when selecting, and actual horizontal wheel scrolling reaches the long labels. Its PNGs also show the retained narrow-dock limitation at 200%: scaled row actions consume the selected name's width. This probe establishes breadcrumb geometry and navigation only; it does not claim that every high-scale hierarchy control is readable.

Those long-label PNGs precede the subsequent compact hierarchy correction and remain unchanged as diagnosis evidence. The current narrow layout moves all four row actions into a shared overflow menu; names, search and scene/navigation actions receive bounded space. Corrected layout/action/drag development evidence is recorded separately in ../hierarchy. Frozen-source qualification remains the release evidence authority.
