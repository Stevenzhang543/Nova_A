# Nova_A 6.3.0 automation and visual-block audit

Engine **6.3.0** · Project Format 2 · schema 29

Open **project.nova**. The unchanged Mouse Knockout game remains playable and exports as a portable Windows game. In Script, open **Scratch Blocks Round Trip.rhai**: saving it must update its linked graph. Change the log string in Blocks, save, and verify Rhai regenerates with the same behavior. Switch to Nodes to verify typed wires and debugging are still present. Add a custom helper in Rhai and confirm it survives as a visible Code block.

Select one object, open **Manage → Automation**, paste **Assets/Automation/Batch Review.rhai**, review its four permissions, and choose **Preview dry run**. No project value may change before Apply. Apply once, verify the object is renamed/tagged, then use Undo last automation and confirm exact restoration. Remove one grant and verify denial. Add an unknown call and verify failure without mutation.

Import a reviewed offline WASM sample only when available. It must remain disabled after import; approve permissions, enable, invoke its contextual contribution, reload, disable, and remove it. No contribution may remain after unload. Never use a production or untrusted plugin for this audit.

Publisher signing, an independent plugin publisher fixture, clean-machine/hardware certification, matching-host builds, and a real-duration soak remain external gates.
