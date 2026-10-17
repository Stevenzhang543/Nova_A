# Nova_A 4.1 keyboard-accessibility report

## Global discovery

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd+Shift+P | Command palette |
| Ctrl/Cmd+P | Quick open assets |
| Ctrl/Cmd+Shift+F | Global search |
| Ctrl/Cmd+K | Context search |
| Ctrl/Cmd+Space | Request script completion |
| F11 | Exclusive fullscreen toggle |
| Escape | Close the top dialog/palette/context menu |

The shortcut editor detects collisions and supports versioned JSON import/export. All stable commands and stable controls are indexed by the command palette. Icon-only actions receive a name/title; disabled stable controls receive a reason.

## Traversal contract

Launcher order is project name → project path → one selected template → details → Create/Open/Learn. Editor order follows top navigation, contextual rail, left dock, center content, right dock, transient bottom dock, status/task actions. Dialog focus remains within modal surfaces and Escape closes without applying destructive work. Visible `:focus-visible` uses the design-system ring.

Automated qualification inventories focusable controls, asserts names/test IDs, opens each workspace and Manage section, and checks console/fatal state. Browser headless automation cannot truthfully certify a screen reader or physical keyboard; final release sign-off therefore retains manual NVDA/Narrator, IME, menu arrow-key, focus-trap, and mixed-monitor traversal as named operator evidence.
