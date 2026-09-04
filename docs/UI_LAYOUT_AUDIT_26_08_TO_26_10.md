# Nova_A 26.08–26.10 all-panel layout and user audit contract

## Required matrix

The cumulative browser matrix covers 1024×640, 1024×768, 1366×768, 1920×1080, 2560×1440 and 3840×2160. It exercises 80%, 100%, 125%, 150% and 200% editor scale; 200%, 300% and 400% game text/caption scale; English, German and Chinese; a long pseudo-locale and RTL runtime content; dark, light and high-contrast themes; normal and reduced motion; keyboard, pointer and coarse-pointer geometry.

Every state must keep the application root free of horizontal scrolling. Panels own their vertical scrolling. A visible control must remain inside its panel or a reachable scrolling region, have a non-empty accessible name, a visible focus route and an adequate hit target. Popovers/dialogs must stay within the viewport and must not become hidden behind canvas, docks or other overlays.

## Surfaces

The audit visits the launcher and every template category; Design, Script, Animation, Interface, Debug and Manage workspaces; scene tabs; hierarchy filters and mutations; transform tools; every Inspector component category; all bottom tabs and overflow menus; Assets and every contextual asset Inspector tab; code, Blocks, Graph and Event Sheet modes; animation/curve/rig/timeline editors; Interface authoring and semantic overlay; Console, Profiler, Physics Monitor and Fault/Recovery paths; Settings, Device Input, Automation, Packages, Project Health, Rendering, Build, Team Workflow and Network Studio; command palette, shortcuts, workspace manager, confirmations, context menus and onboarding.

## User-action dispositions

Each discovered control receives exactly one evidence disposition:

1. **executed-and-restored** — the audit clicks/types/selects/drags, asserts the visible/state effect, then restores it;
2. **executed-in-disposable-project** — destructive authoring is completed only in an isolated generated project and its result/recovery is asserted;
3. **disabled-with-reason** — a prerequisite is deliberately absent and the exact reason is visible;
4. **OS-mediated** — file picker, browser navigation, installer or device action is inspected to its safe boundary without automating the operating-system confirmation;
5. **external-evidence-required** — physical hardware, another host, signing identity, public network or independent human evaluation is required and not claimed locally.

An unclassified control, unnamed focusable control, uncaught error, fatal surface, clipped required action or unresolved overlap is release-blocking. Source-token presence alone does not satisfy an interaction.

## Performance preservation

The same authored project is captured with optimizations enabled and disabled. Canonical project output, physics/network checksums, event order, animation state, graph/code output, controls and exported build inputs must match. Only presentation budgets may adapt. Pointer drawing, object drag/select, graph pan/zoom/drag, asset search, hierarchy scroll and workspace switching record p50/p95/p99 and 1% lows; real low-end hardware remains an external corroboration gate.
