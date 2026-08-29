# Nova_A 5.7 — Worlds, navigation and AI

Nova_A 5.7 keeps Project Format 2/schema 29 and the public Rhai, plugin, package, build and workspace contracts unchanged. The new fields are additive; an old behavior tree, navigation region, TileMap or world chunk receives safe defaults when opened.

## Open World Studio

Open the bottom panel and select **World Studio**. Its Character, Areas, Navigation, AI, Streaming and Pooling tabs are always discoverable. Select a scene object, then use the primary Add button or the focused quick-add buttons. Component edits are manual and reversible through normal project history; runtime diagnostics are automatic and editor-only.

## Navigation

1. Select an object, open **Navigation**, and add `NavigationRegion2D`.
2. Choose Grid for A*, HierarchicalAStar or FlowField, or Polygon for visibility-graph paths. HierarchicalAStar uses Cluster size to plan a coarse corridor before the exact grid query.
3. Edit the navigation polygon, cell size, diagonal policy, layer/mask and traversal cost. A TileMap source also reads each tile's navigation polygon and cost.
4. Add cost areas to multiply local traversal cost. Add directed or bidirectional links for jumps, doors, ladders or teleports. Links never silently connect a blocked endpoint.
5. Add `NavigationObstacle2D` to obstacles and `NavigationAgent2D` to movers. Agents expose speed, acceleration, stopping distance, smoothing, repath interval, avoidance radius/priority and maximum neighbors.
6. Press **Bake navigation**. Baking yields between bounded regions, reports progress and a deterministic artifact hash, and can be cancelled without publishing a partial success.

Runtime scheduling accepts at most 10,000 enabled agents, 256 new repaths per fixed tick and 32 avoidance neighbors per agent. A spatial hash replaces the old all-pairs loop. Deferred agents retain their valid path or show Pending; an impossible query becomes Unreachable with zero velocity rather than a fabricated route.

## Behavior trees, blackboards and perception

Select an object in **AI**, enable the official AI package, add `BehaviorTree2D`, then create or select a behavior-tree asset. Version 1 Sequence, Selector, Condition, Action and Wait nodes remain supported. Version 2 adds:

- a typed boolean/number/string blackboard plus per-object overrides;
- bounded tag sensors with radius, field of view and maximum results;
- BlackboardCondition, SetBlackboard and Perception nodes;
- UtilitySelector nodes that choose the stable highest score from child score key, weight and bias.

During Play, World Studio shows active/ticked/deferred agents, perception queries, the selected object's active node, blackboard, perceived count and utility scores. The Visual Graph debugger retains ordered node/edge timing and errors. Scheduling accepts 10,000 AI objects and executes at most 2,048 due ticks per frame, rotating the remainder deterministically.

## Streaming worlds

Add `WorldChunk2D` to a cell owner and parent the cell's objects beneath it. Configure bounds, load/unload/prefetch distance, priority, scene, dependency UUIDs, cache policy, memory estimate and save-state key. Dependencies load as a transitive closure; the complete closure must fit the project memory budget or the request is rejected visibly.

Activation is asynchronous and cancellable. Before deactivation, Nova_A captures every descendant's enabled state, local transform, velocity and angular velocity in stable UUID order. Reactivation restores that state. The handoff document can be exported and imported for streamed save/reload tests. Release, Retain and LRU policies never force the runtime over its configured memory budget.

When the focus crosses Origin shift threshold, top-level roots move by the same offset and physics is invalidated once. World Studio displays loaded/active/pending cells, current and peak estimated memory, dependency counts and origin-shift count. Estimates are author budgets, not operating-system allocation measurements.

## TileMap worlds

The contextual **TileMap** tab retains layers, terrain rules, deterministic weighted variants, procedural brush presets, previews, collision/navigation/occluder settings and chunk streaming. A TileSet 2.0 tile may reference a scene or prefab. During Play, placements inside the TileMap streaming radius instantiate once, participate in scripts/physics, cache outside the radius and reactivate without duplication.

Press **Bake TileMap** to validate every stable chunk payload before producing collision, navigation and occluder counts plus an artifact hash of deterministic storage. Progress and Cancel remain usable during the background job. Editing the map changes its revision; merely opening or baking it does not rewrite authored cells.

## Release verification

Run:

```text
pnpm references:v5.7.0
pnpm check
pnpm test:core
pnpm build
pnpm verify:v5.7.0
pnpm qualify:v5.7.0:layout
pnpm audit:v5.7.0
pnpm evidence:v5.7.0
pnpm tauri build
pnpm release:v5.7.0
```

The verifier covers the 10,000-agent limits, impossible paths, navigation and TileMap cancellation, behavior-tree v1 migration, blackboard/perception/utility behavior, streamed save/reload, dependency budgets and byte-identical deterministic TileMap storage. Signing, independent clean-machine lifecycle, matching-host non-Windows builds and real wall-clock soak remain external gates until evidence is attached.
