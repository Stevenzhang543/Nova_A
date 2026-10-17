# Nova 26.12 Coin Trail — mixed

Public release **26.12** · Engine **26.12.0** · Project Format 2/schema 29.

Authoring: linked Rhai code and typed structure. The same Coin Trail scene, input map and gameplay source are used by all three variants. Only the blocks variant attaches the graph asset directly. Both modes use the same runtime module resolver and command path.

1. Play. Use WASD or arrow keys to collect the six checkpoints in order. **Expected:** Each checkpoint adds one point; the sixth displays completion.

2. Press R after completion and collect the first checkpoint again. **Expected:** Score and route restart; the first checkpoint can be collected again.

3. Open the gameplay script and switch between Code and Visual three times. **Expected:** All statements remain typed nodes; source comments, variables and custom functions remain present.

4. Select a numeric Literal node used by movement, change its Rhai spelling, save, and inspect Code. **Expected:** Only the intended expression changes; the script passes syntax/VM validation and movement uses the new speed.

5. Add an invalid delimiter in Code, attempt Visual, then cancel and repair it. **Expected:** The invalid draft stays in Code with its diagnostic; repair enables conversion without losing the draft.

6. Save the project, reopen, play, and export Web or Windows on the corresponding available host. **Expected:** The same linked source/graph and six-checkpoint route survive reopening; exported runtime uses the selected Script2D asset.

See [the26.12 language guide](../../../docs/VERSION_26_12_LANGUAGE.md) and the English/German/Chinese offline manual. A generated reference is a repeatable test input; qualification results are recorded separately.
