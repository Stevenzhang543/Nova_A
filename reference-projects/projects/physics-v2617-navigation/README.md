# Nova 26.17 Navigation and streamed worlds

Engine **26.17.0** · Project Format 2/schema 29. Separate26.17 reference; executed qualification is recorded in release evidence.

1. Select World Navigation; bake, cancel, rebake and change clearance/cost/algorithm. **Expected:** Only complete current bakes publish; cancellation is visible and can be retried.

2. Play and use WASD; Navigator pursues Player around Navigation Barrier. Move the barrier while paused. **Expected:** Dynamic geometry invalidates the route; the next bake/repath respects the new obstacle.

3. Inspect World Studio → Streaming and the status card. **Expected:** Streamed Landmarks installs its actual visible/queryable landmark while the cell is active. Failed dependencies stay stopped until repaired and retried.

4. Pause, select Player and shift the origin in the status card. **Expected:** Relative positions and UUIDs are retained; the displayed absolute offset increases. Stop restores the authored scene.

5. Save/reopen and export the exact project. **Expected:** The exported components, navigation source, scene dependency and package permissions match the editor.

6. Read the visible X/Y meter values while playing in editor and export. **Expected:** The readout follows the subject through the ordinary Rhai transform/UI APIs at10Hz; it can be compared with the Inspector while paused.
