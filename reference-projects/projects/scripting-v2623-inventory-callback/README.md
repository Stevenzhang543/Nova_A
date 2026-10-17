# Inventory, helper module and callback

Public release **26.23** · Engine **26.23.0** · Project Format 2/schema 29.

1. Play the project. Expected: HUD shows coins1/items2 and an Inventory Reward is created at runtime.

2. While playing, change the helper body to invalid syntax and save. Expected: Reload is rejected; previous running program and compatible inventory state remain active.

3. Repair the helper, save and inspect the reload status and inventory snapshot. Expected: The affected bundle commits atomically; coins/items and elapsed exported state survive compatible replacement.

4. Stop and use Build Web → Download Web ZIP, serve the extracted index.html beneath a nested path. Expected: The exported player shows coins1/items2 and the same spawned reward without an application backend.

Run the localized26.23 lesson; rejected reload is intentionally tested only in the editor. Live compatible reload does not rerun start.
