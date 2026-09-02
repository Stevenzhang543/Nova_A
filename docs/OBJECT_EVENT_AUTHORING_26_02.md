# Nova_A 26.02 Object Event authoring

## What is bound

An Event Sheet (`.nova-events`) is an optional, designer-facing event index attached to `Script2D`. It does not replace, duplicate, or conceal program logic: `logicAsset` always points to the real `.rhai` or `.nova-graph` asset that `Script2D.scriptAsset` executes in the editor, player, hot reload, and exported build.

Supported rows are Awake, Start, Update, Fixed Update, input press/release, timer, signal, collision enter/stay/exit, trigger enter/stay/exit, UI, animation, and network. Each row owns a stable UUID, name, event family, optional selector, callback, enabled state, priority, and inherited-override policy.

Runtime dispatch uses the existing safe boundaries:

| Event Sheet row | Runtime boundary | Selector |
|---|---|---|
| Awake / Start | Entity lifecycle initialization | none |
| Update / Fixed Update | Render frame / deterministic physics tick | none |
| Input | Latched action edges | input action name |
| Timer | Entity-owned timer queue | timer name |
| Signal | Safe serializable signal queue | signal name |
| Collision / trigger | Same-layer physics event queue | none |
| UI | Named UI callback/signal | UI callback name |
| Animation | Animation signal boundary | marker/signal name |
| Network | Reviewed RPC/network signal boundary | event name |

The canonical callback is skipped when it already ran at that boundary. Custom callbacks run in deterministic priority/identity order and through the same behavior contract, command/log budget, debugger, profiler, hot-reload, error, and export path as handwritten Rhai or generated Graph code.

## Use the Event Sheet

1. Select an entity and add `Script2D` if it does not already exist.
2. Open Script workspace → Event Sheet, or choose an Event Sheet in the Script2D Inspector and press **Open Event Sheet**.
3. Press **+**. Nova_A uses the selected object’s logic asset; if it has none, it creates a visible Rhai asset with safe lifecycle callbacks.
4. Pick the owner (`Entity` or one attached component), then choose the Rhai/Graph action asset.
5. Add an event. Choose its kind, selector when requested, and a callback found in the visible completion list.
6. Use priority only when two callbacks must have an explicit order. Higher values run first; UUID order resolves ties.
7. Attach the sheet to the selected object, save, Play, and inspect Problems/Console/Profiler.
8. Click the underlying asset card to open and edit the real code or graph. The Event Sheet stays visible as its own asset.

Search filters name, kind, selector, and callback without modifying the document. Disabled rows remain saved but do not dispatch. Disabled entities or Script2D components are excluded.

## Inheritance and Object Blueprints

An Event Sheet may inherit another Event Sheet. A local row with `Override inherited` replaces a base row with the same event kind and selector; other base rows are composed. Cycles, missing bases, duplicate exact callbacks, missing logic, missing callback functions, and missing selectors are reported before save/build.

An Object Blueprint (`.nova-object`) wraps a reusable prefab composition plus an Event Sheet, base Object Blueprint, required/excluded component rules, tags, and groups. Inheritance is capped and cycle checked. Required/excluded conflicts and missing prefab/Event Sheet references fail validation. Instantiation uses the standard prefab identity/override path and reattaches the resolved Event Sheet and logic asset.

The quick workflow creates, without hidden resources:

1. a Rectangle or Sprite entity in the current scene;
2. a visible Rhai API v2 logic asset;
3. a visible Event Sheet;
4. Script2D bindings;
5. a prefab; and
6. a visible Object Blueprint.

All references are stored as stable `asset://` IDs and added to the asset dependency graph, so content stripping retains runtime requirements.

## Determinism and limits

- Event Sheet format version: 1; additive under Project Format 2/schema 29.
- Maximum handlers per sheet/dispatch plan: 10,000.
- Maximum inheritance traversal: 64 sheets/blueprints.
- Entity, priority, and handler identity sort is deterministic.
- Each sheet stores a finite non-zero deterministic seed. Equal seeds reproduce the same xorshift stream.
- Timers/tasks remain entity owned and cancellable; dynamic spawn/query/tag/group/component APIs remain Rhai API v2.
- Invalid, missing, cyclic, stale, or oversized data fails closed without mutating the previous verified asset.

## Audit coverage

26.02 verifies lifecycle order, inherited override, duplicate suppression, disabled entities, timer/input/signal/physics dispatch, UI/animation/network routing, hot reload through the underlying asset, prefab/Object Blueprint round trips, repeatable seeds, 10,000-event scheduling, code/graph/event equivalence, frozen schema, save/reopen, dependency closure, export, localization, and compact layouts. Publisher signing, non-Windows matching-host builds, independent usability/accessibility review, and long-duration soak remain explicit external gates.

