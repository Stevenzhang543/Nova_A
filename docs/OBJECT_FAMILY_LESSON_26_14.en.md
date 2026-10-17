# Reusable enemy family

Build one reusable enemy and a derived variant, then prove which asset owns each property and callback.

Use a blueprint for shared composition and an Event Sheet for declared behavior. Change only the instance values that should differ.

- Stop Play before authoring.
- Open Script → Event Sheet and create a Rectangle object, or select an existing scripted object.

1. Use the object workflow to create a prefab, saved Event Sheet and Object Blueprint. Edit the blueprint, name it Enemy Family and save. Save is refused if a required component is also excluded or an inherited source is missing.

2. Choose Derive child blueprint, name it Scout Enemy and leave Prefab and Event Sheet inherited. Save, then instantiate the saved blueprint. The child keeps the actual base asset reference.

3. In Design, refresh Script2D properties and change only the new instance’s move_speed from 6 to 9. Expand Object ownership, search move_speed and compare Authored with Inherited/default value.

4. Open Event authors and follow Open callback author. The editor selects the unique callback declaration in the actual author asset; overloaded or malformed declarations report that the location is ambiguous.

5. Use the enemy-family reference to inspect collision and task callbacks, the UI restart signal and ObjectPool2D. spawn_at uses a matching pool; despawn() in that instance returns it to the pool. There is no separate pool_spawn command.

6. Play and pause. Expand Runtime state to compare the captured authored values with current behavior properties, subscriptions and task/timer queues. These observations cannot edit the running VM.

7. While paused, make a valid logic edit and save. Reload validates all affected scripts before replacing them. Attempt an invalid edit too: the failed candidate must leave the old runtime and dirty source intact.

8. Stop, Undo and Redo an instance change, save the project, reopen it and repeat Play. Inspect the inherited source references and the one deliberate override after reopening.

The child resolves the parent composition; the instance override is visible separately from its baseline; callbacks navigate to their real authors; failed edits preserve the previous runnable state.

Blueprints, Event Sheets, prefab references and instance values are project assets/data. Runtime observations are snapshots and are not saved as authored values.

Create, derive and instantiate use document history. Invalid blueprint drafts survive Cancel and workspace departure. Save or explicit Discard resolves a draft; a changed saved base produces a visible conflict.

All blueprint fields have visible labels. Tab through the modal; Escape opens the same Save/Discard/Cancel decision. At high UI scale, scroll the form while the footer remains reachable.

```rhai
@export(type="float") let move_speed = 6.0;
fn update(dt) { if input_pressed("Jump") { set_position(move_speed, 0.0); } }
```

Open reference-projects/projects/creator-v2614-enemy-family/project.nova. Follow test-controls.json for collision, UI restart, pooled reuse, paused reload and save/reopen; its audit reports record which checks actually ran.
