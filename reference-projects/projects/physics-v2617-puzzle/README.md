# Nova 26.17 Constraints and cloth puzzle

Engine **26.17.0** · Project Format 2/schema 29. Separate26.17 reference; executed qualification is recorded in release evidence.

1. Select Jointed Box and edit its compound collider, joint distance, local anchors, limits and break threshold. **Expected:** The retained native constraint receives live edits; a broken component joint remains broken until rearmed by disable/re-enable or Stop.

2. Play, pause and single-step. Compare the rope, hanging body and small cloth lattice. **Expected:** Gravity pulls the dynamic bodies; constraints retain their authored lengths. Cloth is a body/connection lattice, without a fabric or self-collision claim.

3. Use the rope Connection editor to change segments/material-related settings and save. **Expected:** Explicit rope rebuild changes its node count; point positions and UUID anchors survive reopening.

4. Change friction and masks; Undo/Redo; save/reopen and export. **Expected:** The exact authored project reaches the exported physics runtime.

5. Read the visible X/Y meter values while playing in editor and export. **Expected:** The readout follows the subject through the ordinary Rhai transform/UI APIs at10Hz; it can be compared with the Inspector while paused.
