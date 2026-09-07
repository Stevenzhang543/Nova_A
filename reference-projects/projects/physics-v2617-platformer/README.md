# Nova 26.17 Platforms and materials

Engine **26.17.0** · Project Format 2/schema 29. Separate26.17 reference; executed qualification is recorded in release evidence.

1. Select Player and edit World Studio → Character floor snap and safe margin. **Expected:** Finite edits commit to Undo; invalid values restore the previous value.

2. Play; use A/D and Space. Pause and single-step while falling or landing. **Expected:** The character falls, jumps and lands once per fixed tick; the Platform is one-way and Moving Platform carries a supported character.

3. Change Platform friction, layer/mask and one-way flag, then Undo/Redo. **Expected:** The next native synchronization applies the authored shape/material/filter values.

4. Save/reopen and export the exact project. **Expected:** The reopened and exported player use the same component and script data. Keep the unbounded moving platform demonstration under20seconds or add a reversing controller.

5. Read the visible X/Y meter values while playing in editor and export. **Expected:** The readout follows the subject through the ordinary Rhai transform/UI APIs at10Hz; it can be compared with the Inspector while paused.
