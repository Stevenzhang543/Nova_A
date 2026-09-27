# Godot reference decisions for 26.31

The supplied local Godot development checkout is a reference, not Nova_A's backend. This release reviewed `scene/gui/box_container.cpp` sizing (minimum/desired/maximum and stretch), `editor/icons/ExpandBottomDock.svg` icon treatment and `core/math/vector2.h` conventions. It does not claim a complete Godot source review.

Godot allocates space from child requirements rather than assuming a header is smaller than its controls. Nova_A applies that principle through intrinsic collapsed-dock height and form container queries. Shared original SVG paths use `currentColor`, allowing existing themes to control contrast; translated accessible button names and explanatory text remain. Vue/TypeScript retains its own component structure rather than mechanically adopting C++ formatting.

Godot's Vector2 uses `real_t`; Nova_A's standalone numerical layer uses f64 and its own finite bounds, EPSILON and minimum dimensions. Blindly replacing tolerances, orientation conventions or solver equations would affect contacts, joints, saved scenes and replay determinism. No such substitution is justified by the UI defects, and no mathematics is changed in 26.31. Rust workspace tests execute the existing mathematical/physics contracts.

No Godot code or SVG artwork was copied into shipped source, so no new third-party attribution is needed for this implementation. The existing MIT project license remains. Broader engine parity, native debugger suspension, full native scripted servers, platform support and all conditional UI behavior retain their documented narrower scope; similar panel names are not proof of parity.
