# Nova 26.14 Enemy Family

Engine **26.14.0**. Project Format 2/schema 29. Execution evidence is recorded separately.

1. Select Authored Scout and inspect Object ownership; open its blueprint and inherited callback author. **Expected:** The child points to Enemy Family, move_speed is authored 9 against prefab default 6, and collision/task authors are Enemy Family.rhai.

2. Play and move the blue mouse-controlled block into an orange scout. **Expected:** A physical collision changes the inherited collision_count and logs FAMILY_COLLISION.

3. Pause after 0.2 seconds and inspect a spawned scout. **Expected:** Runtime origin is runtime-spawned; primary and inherited behaviors have separate properties, and FAMILY_TASK confirms the named task fired.

4. Resume and knock all eight orange scouts outside the camera. **Expected:** Score reaches 8 / 8, the completion banner appears and active pooled instances return to zero.

5. Click Restart wave (or press R), inspect Game Manager pool statistics, and repeat a collision. **Expected:** Eight scouts reappear from the same pool; allocated capacity remains eight, reused count increases and fresh behavior instances receive callbacks.

6. Pause, edit Scout Enemy.rhai move_speed logic, save a valid candidate, then attempt malformed source. **Expected:** Valid paused reload changes only committed behavior; malformed save leaves the old VM, values and dirty source intact.

7. Stop, change an instance property, Undo/Redo, save the project, reopen and play again. **Expected:** Blueprint/Event Sheet identities, the authored override, UI restart and pool configuration survive reopening.

Authored Scout is a disabled editor example and does not add a ninth target. Eight pooled scouts form the playable wave. Move the blue block with the mouse, clear all eight, then use Restart wave or R. The original game scene is adapted from the bundled Mouse Knockout template.
