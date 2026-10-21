# Nova_A 26.42 quick start — your first game in 30 minutes

This path starts from the **Platformer Scene** template, changes how the player moves, plays it and exports it for the web. After that, four short notes explain the timing rules that most often surprise new users. Everything here works offline.

[中文版](./QUICKSTART_26_42.zh.md) · [Full manual](../manual/index.html) · Scripting contract

## 1. Open the template (5 min)

1. Start Nova_A. In the launcher choose **New Project**.
2. Pick **Platformer Scene**, give the project a name and a folder, then **Create Project**.
3. The first-run tour opens once. Read it or choose **Skip for now**.

The editor has three columns: **Scenes / Hierarchy** on the left, the scene in the middle with its tools floating over it, and the **Inspector** on the right. Select **Player** in the Hierarchy; the Inspector shows its Transform first, then its components.

New projects made from templates in 26.42 run physics at **120 Hz with 4 substeps** (see note B). Projects made with earlier versions keep the rate they were saved with.

## 2. Change the movement with `@export` (10 min)

1. With **Player** selected, find the **Script** section in the Inspector. Values marked `@export` in the script appear there as fields: `speed` (8), `jump_speed` (12) and `gravity` (−22).
2. Set `speed` to **11** and `jump_speed` to **14**. The change is saved with the scene; the script file is not edited.
3. To see where the values come from, switch to the **Script** workspace and open the player's `.rhai` file. Each field is one line such as:

   ```rhai
   @export(type="float", min=0, max=30, step=0.1, group="Movement", tooltip="Horizontal speed in world units per second") let speed = 8.0;
   ```

   `min`, `max` and `step` limit the Inspector field; `group` and `tooltip` only change how it is shown.

## 3. Play and stop (5 min)

1. Press **Play** (the triangle at the top right).
2. Click the scene once so it has keyboard focus, then move with **A/D** or the arrow keys and jump with **Space**.
3. While the game runs the floating scene controls fade out after 1.5 s without pointer movement, and the Inspector shows the running values about ten times per second.
4. Press **Stop**. Everything you changed during Play is reset to the authored scene. Edit values only while stopped if you want to keep them.

## 4. Export for the web (10 min)

1. Open the **Manage** workspace and choose **Build Settings**.
2. Select the **Web** target and an output folder. The export writes `index.html`, the Nova Player files and `game.nova-pak`.
3. Run the export. Serve the folder with any static web server (opening `index.html` directly from disk is blocked by most browsers) and open it in a browser. The exported game contains no editor tools.

If an asset fails validation the export stops and names the asset; fix or remove it and export again.

## Four timing rules

### A. `fixed_update` moves things, `update` reads input once per frame

- `fixed_update(dt)` runs once per physics step with a constant `dt` (1/120 s in new templates). Put movement, forces and anything that must behave the same on every machine here.
- `update(dt)` runs once per displayed frame with the frame time. Use it for presentation: text, effects, camera polish.
- `input_pressed` in `update` is true for the frame in which the key went down. In `fixed_update` it is true in the first physics step after the press; a press is kept until a step runs, so it is not lost in frames without a step. For held keys use `input_down`.

### B. The physics rate sets part of your input latency

Input is applied at the next physics step. On average that wait is half a step: about 8 ms at 60 Hz, 4 ms at 120 Hz and 2 ms at 240 Hz. A higher rate costs CPU time per step; templates use 120 Hz with 4 substeps, which keeps the total substep count of the old 60 Hz × 8 setting. You can change it under **Physics → Physics tick rate**.

### C. Writes apply after the callback

Calls that change the world — `set_position`, `set_velocity`, `entity_set_position`, `apply_impulse` and similar — are queued and applied by the engine after your callback returns. Reads inside the same callback return the state from before it started:

```rhai
fn fixed_update(dt) {
  set_position(9.0, 9.0);
  let x = transform().position_x;   // still the old x
}
```

Script variables (including `@export` values) change immediately. Keep the value you wrote in a variable if you need it again in the same callback. `scripts/verify-2642-script-write-read.mjs` checks this behaviour against the shipped script runtime.

### D. When collision callbacks and timers fire

- When one frame runs several physics steps, collision and trigger callbacks for all of them are delivered together after the last step. A callback can therefore arrive one or more steps after the contact began. If you need step-exact behaviour, query contacts or positions in `fixed_update` instead.
- `timer_start(name, seconds, repeat)` fires `on_timer(name)`. Projects made from 26.42 templates use the **fixed-step timer clock**: timers advance with each physics step and fire just before that step's `fixed_update`, so a timer expires in the same step at any frame rate. Older projects keep the frame-time clock, where a 0.1 s timer may fire between steps; switch under **Physics → Timer clock**.

## Next

- The **Skyline Trilogy**, **Pendulum Post** and **Reflex Lab** templates (new in 26.42) show checkpoints and timed stages, joints and ropes, and input timing respectively.
- The full manual describes every component and editor window; `docs/FIRST_GAME_5_0.md` is the longer original walkthrough.
