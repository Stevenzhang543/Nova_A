# Nova 26.15 Coin Trail — mixed

Public release **26.15** · Engine **26.15.0** · Project Format 2/schema 29.

Authoring: linked Rhai code and typed structure. The same Coin Trail scene, input map and gameplay source are used by all three variants. Only the blocks variant attaches the graph asset directly. Both modes use the same runtime module resolver and command path.

1. Arrange the whole typed graph, then select a region and arrange only that region. Undo and Redo. **Expected:** Unselected/manual positions, node identities and viewport survive; playing still follows the same six-point route.

2. Add and move a wire reroute, save/reopen the graph, maximize and restore its panels. **Expected:** Waypoints persist in order, node fields remain reachable and saved panel dimensions return.

3. Play. Use WASD or arrow keys to collect the six checkpoints in order. **Expected:** Each checkpoint adds one point; the sixth displays completion.

4. Press R after completion and collect the first checkpoint again. **Expected:** Score and route restart; the first checkpoint can be collected again.

5. Open the gameplay script and switch between Code and Visual three times. **Expected:** All statements remain typed nodes; source comments, variables and custom functions remain present.

6. Select a numeric Literal node used by movement, change its Rhai spelling, save, and inspect Code. **Expected:** Only the intended expression changes; the script passes syntax/VM validation and movement uses the new speed.

7. Add an invalid delimiter in Code, attempt Visual, then cancel and repair it. **Expected:** The invalid draft stays in Code with its diagnostic; repair enables conversion without losing the draft.

8. Save the project, reopen, play, and export Web or Windows on the corresponding available host. **Expected:** The same linked source/graph and six-checkpoint route survive reopening; exported runtime uses the selected Script2D asset.

See [the26.14 object-family lesson and current asset/rendering manual](../../../docs/OBJECT_FAMILY_LESSON_26_14.en.md) and the English/German/Chinese offline manual. A generated reference is a repeatable test input; qualification results are recorded separately.
