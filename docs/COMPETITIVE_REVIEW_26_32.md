# Nova_A 26.32 editor reference study

Three parallel research/implementation agents reviewed official Godot, Defold and GDevelop materials and the supplied Godot source. This is a focused editor/control study, not a claim to have read every engine source line or copied their runtime behavior.

| Reference | Studied structure | Applied in Nova_A |
| --- | --- | --- |
| [Godot editor introduction](https://docs.godotengine.org/en/stable/getting_started/introduction/first_look_at_the_editor.html) and local editor bottom-panel/spin-slider code | Scene/inspector docks, contextual toolbars, selectable bottom tabs, bounded property editors | Compact dock chrome, persistent scrollable tool tabs, grouped playback and SVG navigation |
| [Defold editor](https://defold.com/manuals/editor/) and [properties](https://defold.com/manuals/properties/) manuals | Selection-owned properties, compact numeric/vector groups, resizable panes | Typed field measures, wrapping numeric pairs and inspector label/value columns |
| [GDevelop scene editor](https://wiki.gdevelop.io/gdevelop5/interface/scene-editor/) and [events editor](https://wiki.gdevelop.io/gdevelop5/interface/events-editor/) | Contextual properties and tools, recoverable panel visibility, discoverable history | Context icons retain labels/tooltips; editing/undo/redo/save and panel recovery are tested alongside visual geometry |

The design follows these established editor patterns in Nova_A's existing Vue components. Ten Godot SVG geometries are actually copied/adapted, with exact local source paths, hashes and modifications in `public/third-party/godot-editor-icons.json`, and MIT terms in `public/third-party/godot-editor-icons-LICENSE.txt` and root `LICENSE.md`. No Defold or GDevelop code/art is copied. Engine physics algorithms and game-authored interfaces are outside this GUI change.

Detailed research and per-component consequences: [Godot study](GODOT_UI_REFERENCE_26_32.md), [form design](FORM_DESIGN_26_32.md), [visual audit](UI_AUDIT_PLAN_26_32.md).
