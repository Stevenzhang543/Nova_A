# Nova_A 6.5.0 physics and renderer audit

Engine **6.5.0** · Project Format 2 · schema 29

Open **project.nova**. The retained Physics Sandbox remains playable and exportable as **Nova 6.5 Physics Renderer Audit**.

1. Enable physics debug. **Jointed Box** has exact crossing horizontal/vertical children and a blue sensor lobe; contacts must show stable child IDs and no filled convex envelope. Drag, resize and rotate it, then run continuously so the outer arm exercises rotational CCD.
2. **Ground** adds a five-point Chain, a six-point static concave L shape and a one-way shelf. Their debug outlines must match the pieces without a seam. Temporarily make the Ground dynamic and confirm Project Health blocks it; undo.
3. Run the joint and Rope2D sample. The prismatic/revolute settings use linear/angular motors and limits; break reactions appear in Physics Monitor. Rope particles ignore the two rope owners, collide with Ground/Jointed Box, and transfer force through the anchors.
4. Bind two overlapping rectangles into a cross or two triangles into a hexagram, move/run/separate them, and confirm one transform/collision response with restored originals. Change a child layer/mask and confirm only eligible contacts remain.
5. In Rendering → Quality, move the active camera through **Hero fidelity**, **Low-end outer field**, and outside both. Diagnostics must report the active volume plus passes, lights, particles, textures, uploads, shader fallbacks and context recovery.
6. Repeat in English, German and Chinese at 100–200% UI scale. One grid unit, one Inspector unit and one physics meter must match. Build & Run and confirm the output launches independently.

Publisher signing, independent clean-machine/hardware/accessibility certification, matching-host non-Windows builds and a real-duration soak remain external gates.
