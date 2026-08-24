# Nova_A 4.1 navigation and legacy aliases

The stable top-level workspaces are Design, Script, Animation, UI, Debug, and Manage. The left rail changes with the selected workspace instead of acting as a second global navigation bar. The current project/object/tool context is displayed next to the workspace buttons.

Manage owns Settings, Packages, Project Health, global Rendering policy, and Build Settings. Assets, Console, Animation, Audio, and Profiler remain transient bottom tools where useful. Physics Monitor is opened from Debug and never occupies unrelated workspaces.

## Legacy command mapping

| Previous destination/command | v4.1 destination/alias |
| --- | --- |
| Global left Game | Debug workspace → Game |
| Bottom Packages | Manage → Packages (`openEditorTool('packages')` redirects) |
| Bottom Project | Manage → Project health (`openEditorTool('project')` redirects) |
| Bottom Rendering | Manage → Rendering (`openEditorTool('rendering')` redirects) |
| Bottom Build | Manage → Build (`openEditorTool('build')` redirects) |
| Bottom Presentation | UI workspace; legacy tab request resolves to Assets where needed |
| Settings page | Manage → Settings; legacy `settings` page remains accepted during layout restoration |
| Manual | Learn Nova_A on launcher; Help retains the complete manual |
| Complete | Automatic completion; Ctrl/Cmd+Space explicitly requests completion |
| Interface workspace ID | Migrates to `ui` during stored-layout restoration |
| World bottom tab | Migrates to the Project/Manage compatibility route |

Custom layouts remain in Workspace Manager and do not create a seventh public workspace. Stored v1 layouts are normalized, removed bottom-policy tabs migrate safely, unknown dimensions clamp to minimums, and a Safe Layout reset is always available.
