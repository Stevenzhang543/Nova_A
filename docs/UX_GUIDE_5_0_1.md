# Nova_A 5.0.1 user-experience guide

## Why the editor changed

The 5.0 editor exposed nearly every capability at once. That made features discoverable in theory but slowed normal work: the two toolbar rows competed for attention, secondary scene tools forced horizontal scrolling at common widths, the context rail truncated labels, and 11 px text was difficult to scan. Light surfaces were also too close in brightness while dark surfaces lacked enough depth separation.

5.0.1 organizes existing capabilities by frequency and context. It does not remove a feature, command, shortcut, animation, or persisted contract.

## Control map

| Need | Direct control | Grouped control |
|---|---|---|
| Change workflow | Design, Script, Animation, Interface, Debug, Manage | Workspace Manager under Layout |
| Navigate | Back and Forward | Quick Open and Command Palette under Commands |
| Transform | Select, Move, Rotate, Scale | Align, distribute, mirror, frame, isolate, focus and group under Arrange |
| Create/edit geometry | Create Object | Pivot, rectangle transform, path, polygon, collider, measure and shape tools under Authoring tools |
| Configure the viewport | — | Transform/pivot reference, grid/angle snap, guides/rulers and camera frame under View settings |
| Change panel visibility | — | Hierarchy, Inspector, Bottom Panel and Focus Mode under Layout |
| Run the game | Play, Pause, Step and Stop | Debug tools remain in the Debug workspace |

Every grouped command retains its existing keyboard shortcut and remains available through Commands/search where supported. The File/Edit/Project/Debug/View/Help menus remain authoritative fallbacks.

## Visual language

- Sky blue represents selection, navigation, focus and primary confirmation.
- Teal represents creation and additive actions.
- Violet is a secondary accent for advanced or supporting surfaces.
- Amber represents warning or unsaved state; red remains destructive/failure only; green remains success/healthy runtime only.
- Dark mode uses deep blue-black canvas and stepped slate surfaces. Light mode uses muted cool gray-blue canvas and off-white/slate surfaces instead of pure white.
- Borders separate surfaces before shadows do. Floating popovers use the strongest elevation; ordinary docks remain quiet.

## Typography and spacing

- Captions and auxiliary labels: at least 12 px.
- Dense controls and menus: at least 13 px.
- Body content: 14 px.
- Section titles: 16 px; page titles: 22 px.
- The UI font stack prioritizes bundled rounded Nunito/Noto faces and rounded platform faces. Monospace is reserved for code, shortcuts, IDs and numeric diagnostics.
- Context-rail labels may use two lines. German text must wrap or ellipsize inside its own surface; Chinese text stays horizontal unless a component explicitly represents vertical writing.

## Motion and accessibility

Hover and press feedback use short opacity, color, border and one-pixel position changes. Popovers and pages use restrained reveal transitions. `prefers-reduced-motion` and Nova_A's Reduce Motion setting remove nonessential movement while retaining immediate state feedback. All named popovers use native focusable controls; tooltips and accessible names remain present for glyphs. Registry-generated names and disabled reasons refresh with live language changes so screen readers and voice control never retain the previous locale.

## Qualification matrix

Before release, test launcher, migration dialog, every workspace, all bottom-dock tabs, Settings, Project Health, Packages, Rendering and Build Settings with:

- English, German and Chinese;
- dark and light themes;
- 1280×720, 1440×900 and 1920×1080;
- compact, default and comfortable UI scale;
- reduced motion and keyboard-only navigation.

Fail the release for clipped actionable text, overlapping controls, unexpected horizontal page/toolbars, unreachable popovers, off-screen dialogs, raw translation keys, browser-native confirmation dialogs, canvas collapse, or a control that no longer triggers its existing action.

## Compatibility

Nova_A 5.0.1 remains Project Format 2 schema 29 with Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, Workspace document 3 and the frozen eleven-file release format. The patch does not require project migration or asset reimport.
