# Every Vue surface — 26.21 audit baseline

Each source was parsed. Counts identify review work; they are not passing interaction checks. Inline-rendered controls (including the inspector’s PropertyRow/NumberRange) need the additional source review and mounted-DOM audit. Full handlers, models and conditional expressions are in PANEL_AUDIT_26_21.json.

| Surface | Controls | Conditional/repeated sections | Handlers | Models | Inline components | Browser status |
|---|---:|---:|---:|---:|---|---|
| [src/App.vue](../src/App.vue) | 0 | 11 | 0 | 0 | No | Pending for modified 26.21 source |
| [src/PlayerApp.vue](../src/PlayerApp.vue) | 2 | 8 | 2 | 0 | No | Pending for modified 26.21 source |
| [src/components/AccessibilityEvidencePanel.vue](../src/components/AccessibilityEvidencePanel.vue) | 2 | 4 | 2 | 0 | No | Pending for modified 26.21 source |
| [src/components/ActionBar.vue](../src/components/ActionBar.vue) | 4 | 0 | 4 | 0 | No | Pending for modified 26.21 source |
| [src/components/AndroidDeliveryPanel.vue](../src/components/AndroidDeliveryPanel.vue) | 11 | 9 | 7 | 4 | No | Pending for modified 26.21 source |
| [src/components/AnimationPanel.vue](../src/components/AnimationPanel.vue) | 200 | 137 | 97 | 131 | No | Pending for modified 26.21 source |
| [src/components/AssetImagePreview.vue](../src/components/AssetImagePreview.vue) | 0 | 2 | 0 | 0 | No | Pending for modified 26.21 source |
| [src/components/AudioSystemPanel.vue](../src/components/AudioSystemPanel.vue) | 0 | 0 | 0 | 0 | No | Pending for modified 26.21 source |
| [src/components/AutomationStudio.vue](../src/components/AutomationStudio.vue) | 8 | 8 | 7 | 4 | No | Pending for modified 26.21 source |
| [src/components/BuildSettingsPanel.vue](../src/components/BuildSettingsPanel.vue) | 56 | 31 | 9 | 47 | No | Pending for modified 26.21 source |
| [src/components/CommandPalette.vue](../src/components/CommandPalette.vue) | 2 | 4 | 4 | 1 | No | Pending for modified 26.21 source |
| [src/components/ConfigPanel.vue](../src/components/ConfigPanel.vue) | 350 | 108 | 83 | 172 | Yes | Pending for modified 26.21 source |
| [src/components/ConfirmDialog.vue](../src/components/ConfirmDialog.vue) | 2 | 1 | 3 | 0 | No | Pending for modified 26.21 source |
| [src/components/ConnectionBuilder.vue](../src/components/ConnectionBuilder.vue) | 22 | 16 | 16 | 13 | No | Pending for modified 26.21 source |
| [src/components/ConsolePanel.vue](../src/components/ConsolePanel.vue) | 5 | 5 | 2 | 3 | No | Pending for modified 26.21 source |
| [src/components/ContentAssetInspector.vue](../src/components/ContentAssetInspector.vue) | 20 | 33 | 18 | 7 | No | Pending for modified 26.21 source |
| [src/components/ContextMenu.vue](../src/components/ContextMenu.vue) | 18 | 3 | 20 | 0 | No | Pending for modified 26.21 source |
| [src/components/CreateObjectPalette.vue](../src/components/CreateObjectPalette.vue) | 6 | 6 | 10 | 1 | No | Pending for modified 26.21 source |
| [src/components/CreatorLearningCenter.vue](../src/components/CreatorLearningCenter.vue) | 14 | 23 | 9 | 5 | No | Pending for modified 26.21 source |
| [src/components/CreatorOnboarding.vue](../src/components/CreatorOnboarding.vue) | 4 | 3 | 5 | 0 | No | Pending for modified 26.21 source |
| [src/components/DeviceInputPanel.vue](../src/components/DeviceInputPanel.vue) | 42 | 15 | 24 | 25 | No | Pending for modified 26.21 source |
| [src/components/EcosystemStudioPanel.vue](../src/components/EcosystemStudioPanel.vue) | 45 | 25 | 26 | 19 | No | Pending for modified 26.21 source |
| [src/components/EditorBottomPanel.vue](../src/components/EditorBottomPanel.vue) | 170 | 115 | 102 | 84 | No | Pending for modified 26.21 source |
| [src/components/EditorFeedback.vue](../src/components/EditorFeedback.vue) | 10 | 18 | 10 | 0 | No | Pending for modified 26.21 source |
| [src/components/ErrorRecovery.vue](../src/components/ErrorRecovery.vue) | 4 | 2 | 5 | 0 | No | Pending for modified 26.21 source |
| [src/components/EventSheetEditor.vue](../src/components/EventSheetEditor.vue) | 26 | 17 | 27 | 13 | No | Pending for modified 26.21 source |
| [src/components/ExternalChangeDialog.vue](../src/components/ExternalChangeDialog.vue) | 4 | 2 | 4 | 0 | No | Pending for modified 26.21 source |
| [src/components/GameplayComponentsInspector.vue](../src/components/GameplayComponentsInspector.vue) | 55 | 18 | 0 | 55 | No | Pending for modified 26.21 source |
| [src/components/GraphProductionPanel.vue](../src/components/GraphProductionPanel.vue) | 75 | 37 | 67 | 27 | No | Pending for modified 26.21 source |
| [src/components/ImportedAssetBindings.vue](../src/components/ImportedAssetBindings.vue) | 2 | 4 | 3 | 0 | No | Pending for modified 26.21 source |
| [src/components/LayerBar.vue](../src/components/LayerBar.vue) | 2 | 1 | 3 | 0 | No | Pending for modified 26.21 source |
| [src/components/ManageWorkspace.vue](../src/components/ManageWorkspace.vue) | 1 | 8 | 1 | 0 | No | Pending for modified 26.21 source |
| [src/components/ManualViewer.vue](../src/components/ManualViewer.vue) | 2 | 2 | 4 | 0 | No | Pending for modified 26.21 source |
| [src/components/MaterialGraphEditor.vue](../src/components/MaterialGraphEditor.vue) | 20 | 16 | 18 | 11 | No | Pending for modified 26.21 source |
| [src/components/NetworkStudioPanel.vue](../src/components/NetworkStudioPanel.vue) | 112 | 54 | 104 | 79 | No | Pending for modified 26.21 source |
| [src/components/ObjectBlueprintEditor.vue](../src/components/ObjectBlueprintEditor.vue) | 13 | 12 | 10 | 6 | No | Pending for modified 26.21 source |
| [src/components/ObjectOwnershipPanel.vue](../src/components/ObjectOwnershipPanel.vue) | 11 | 22 | 12 | 1 | No | Pending for modified 26.21 source |
| [src/components/PackageManagerPanel.vue](../src/components/PackageManagerPanel.vue) | 18 | 32 | 18 | 3 | No | Pending for modified 26.21 source |
| [src/components/PanelMaximizeButton.vue](../src/components/PanelMaximizeButton.vue) | 1 | 0 | 1 | 0 | No | Pending for modified 26.21 source |
| [src/components/PanelResizeHandle.vue](../src/components/PanelResizeHandle.vue) | 0 | 0 | 7 | 0 | No | Pending for modified 26.21 source |
| [src/components/ParticleGraphEditor.vue](../src/components/ParticleGraphEditor.vue) | 19 | 19 | 20 | 1 | No | Pending for modified 26.21 source |
| [src/components/PhysicsRuntimePanel.vue](../src/components/PhysicsRuntimePanel.vue) | 18 | 21 | 18 | 2 | Yes | Pending for modified 26.21 source |
| [src/components/PhysicsSettingsPanel.vue](../src/components/PhysicsSettingsPanel.vue) | 39 | 18 | 12 | 30 | No | Pending for modified 26.21 source |
| [src/components/PluginSettings.vue](../src/components/PluginSettings.vue) | 6 | 5 | 6 | 1 | No | Pending for modified 26.21 source |
| [src/components/PresentationPanel.vue](../src/components/PresentationPanel.vue) | 138 | 61 | 115 | 89 | No | Pending for modified 26.21 source |
| [src/components/ProfilerPanel.vue](../src/components/ProfilerPanel.vue) | 115 | 48 | 95 | 70 | No | Pending for modified 26.21 source |
| [src/components/ProjectHealthPanel.vue](../src/components/ProjectHealthPanel.vue) | 22 | 15 | 19 | 3 | No | Pending for modified 26.21 source |
| [src/components/ProjectManager.vue](../src/components/ProjectManager.vue) | 35 | 23 | 28 | 6 | No | Pending for modified 26.21 source |
| [src/components/RecoveryCenter.vue](../src/components/RecoveryCenter.vue) | 9 | 7 | 7 | 1 | No | Pending for modified 26.21 source |
| [src/components/RenderingPanel.vue](../src/components/RenderingPanel.vue) | 125 | 75 | 78 | 83 | No | Pending for modified 26.21 source |
| [src/components/RuntimeComponentsInspector.vue](../src/components/RuntimeComponentsInspector.vue) | 295 | 73 | 51 | 251 | Yes | Pending for modified 26.21 source |
| [src/components/SaveDataSettings.vue](../src/components/SaveDataSettings.vue) | 7 | 7 | 6 | 1 | No | Pending for modified 26.21 source |
| [src/components/SceneSideBar.vue](../src/components/SceneSideBar.vue) | 22 | 19 | 42 | 7 | No | Pending for modified 26.21 source |
| [src/components/SceneTabs.vue](../src/components/SceneTabs.vue) | 14 | 12 | 15 | 3 | No | Pending for modified 26.21 source |
| [src/components/ScriptConversionPanel.vue](../src/components/ScriptConversionPanel.vue) | 5 | 7 | 5 | 0 | No | Pending for modified 26.21 source |
| [src/components/ScriptStudio.vue](../src/components/ScriptStudio.vue) | 87 | 71 | 81 | 26 | No | Pending for modified 26.21 source |
| [src/components/ScriptWorkspace.vue](../src/components/ScriptWorkspace.vue) | 5 | 5 | 9 | 0 | No | Pending for modified 26.21 source |
| [src/components/ShortcutEditor.vue](../src/components/ShortcutEditor.vue) | 9 | 4 | 11 | 1 | No | Pending for modified 26.21 source |
| [src/components/SimulationStatusPanel17.vue](../src/components/SimulationStatusPanel17.vue) | 6 | 7 | 6 | 0 | No | Pending for modified 26.21 source |
| [src/components/StudioDraftConflict.vue](../src/components/StudioDraftConflict.vue) | 2 | 0 | 2 | 0 | No | Pending for modified 26.21 source |
| [src/components/StudioStatusDialog.vue](../src/components/StudioStatusDialog.vue) | 11 | 7 | 7 | 5 | No | Pending for modified 26.21 source |
| [src/components/TeamWorkflowPanel.vue](../src/components/TeamWorkflowPanel.vue) | 40 | 12 | 29 | 18 | No | Pending for modified 26.21 source |
| [src/components/TilemapPanel.vue](../src/components/TilemapPanel.vue) | 72 | 38 | 58 | 37 | No | Pending for modified 26.21 source |
| [src/components/TimelineButtonAction.vue](../src/components/TimelineButtonAction.vue) | 1 | 2 | 1 | 0 | No | Pending for modified 26.21 source |
| [src/components/ToolBar.vue](../src/components/ToolBar.vue) | 37 | 11 | 29 | 8 | No | Pending for modified 26.21 source |
| [src/components/UiScenePreview.vue](../src/components/UiScenePreview.vue) | 0 | 2 | 0 | 0 | No | Pending for modified 26.21 source |
| [src/components/UndoHistoryPanel.vue](../src/components/UndoHistoryPanel.vue) | 4 | 3 | 4 | 0 | No | Pending for modified 26.21 source |
| [src/components/VirtualControlsOverlay.vue](../src/components/VirtualControlsOverlay.vue) | 1 | 3 | 7 | 0 | No | Pending for modified 26.21 source |
| [src/components/VisualGraphEditor.vue](../src/components/VisualGraphEditor.vue) | 89 | 72 | 126 | 16 | No | Pending for modified 26.21 source |
| [src/components/WorkspaceBar.vue](../src/components/WorkspaceBar.vue) | 10 | 2 | 10 | 0 | No | Pending for modified 26.21 source |
| [src/components/WorkspaceManager.vue](../src/components/WorkspaceManager.vue) | 27 | 6 | 27 | 2 | No | Pending for modified 26.21 source |
| [src/components/WorldCanvas.vue](../src/components/WorldCanvas.vue) | 1 | 7 | 22 | 0 | No | Pending for modified 26.21 source |
| [src/components/WorldComponentsInspector.vue](../src/components/WorldComponentsInspector.vue) | 58 | 15 | 22 | 50 | No | Pending for modified 26.21 source |
| [src/components/WorldToolsPanel.vue](../src/components/WorldToolsPanel.vue) | 129 | 61 | 25 | 106 | No | Pending for modified 26.21 source |
| [src/layout/EditorLayout.vue](../src/layout/EditorLayout.vue) | 2 | 23 | 25 | 0 | No | Pending for modified 26.21 source |
| [src/layout/SideBar.vue](../src/layout/SideBar.vue) | 2 | 1 | 2 | 0 | No | Pending for modified 26.21 source |
| [src/layout/StatusBar.vue](../src/layout/StatusBar.vue) | 1 | 1 | 1 | 0 | No | Pending for modified 26.21 source |
| [src/layout/TopBar.vue](../src/layout/TopBar.vue) | 46 | 8 | 49 | 0 | No | Pending for modified 26.21 source |
| [src/panels/RendererPanel.vue](../src/panels/RendererPanel.vue) | 0 | 0 | 0 | 0 | No | Pending for modified 26.21 source |
| [src/panels/ScenePanel.vue](../src/panels/ScenePanel.vue) | 0 | 0 | 0 | 0 | No | Pending for modified 26.21 source |
| [src/panels/SettingsPanel.vue](../src/panels/SettingsPanel.vue) | 133 | 27 | 46 | 68 | Yes | Pending for modified 26.21 source |

## Binding-route audit

102 distinct catalog source/test paths checked; 0 missing. Existing paths still require field-specific behavioral evidence.


## Programmer findings

- The global router is a snapshot safety net, not evidence that each field validates or applies at runtime. A generic route must never close EDIT-02.
- The inspector has explicit entity history and inline form components. Other domains have their own commit paths; test each domain and retain explicit transactions.
- Some scoped form dimensions remain pixel-based. New text-relative shared rules start with inspector/settings; nested panels, dialogs and conditional content remain in the matrix above.
- A source-only inventory cannot certify all dynamic bindings or all possible edits. Record actual visited conditions and unvisited prerequisites in subsequent browser reports.
