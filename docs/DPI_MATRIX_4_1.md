# Nova_A 4.1 DPI and layout matrix

Required catalog families are SHELL (launcher/editor/navigation), LCH (project creation), HLT (Project Health/Physics telemetry), and BLD (Manage/Build/Task Center). The browser runner records deterministic screenshots and layout assertions; native mixed-monitor moves remain an external operator gate when only one physical scale is attached.

## Automated matrix

| Logical viewport | Scales | Languages | Required result |
| --- | --- | --- | --- |
| 1366×768 | 100, 125, 150, 175, 200% | English, Simplified Chinese | Center editor remains usable; application has no whole-window horizontal scroll. |
| 1920×1080 | 100–200% | English, Simplified Chinese | All thirteen reference surfaces and dialogs remain contained. |
| 2560×1440 | 100–200% | English, Simplified Chinese | Dock/floating/panel content remains aligned and sharp. |
| 3840×2160 | 100–200% | English, Simplified Chinese | No raster-scaled text or incorrect fixed-pixel enlargement. |

German is retained by the broad three-language layout smoke to catch long labels. The runner rejects visible control overflow, sibling overlap in toolbars/tabs, non-horizontal label writing, missing shell surfaces, fatal recovery UI, and serious browser-console errors.

## Native DPI behavior

The Windows manifest declares `PerMonitorV2`. First launch maximizes a borderless resizable window on the active monitor; subsequent launches validate saved bounds against current monitors. Missing monitors recenter safely. A scale-change event dispatches relayout and saves current valid state. F11 alone toggles exclusive fullscreen. Manual evidence must name the monitor, native scale, logical/physical resolution, GPU/webview, and result.

## Review rule

Pixel diffs are evidence, not automatic approval. Intentionally changed shell baselines require an explicit reviewer entry. Unreviewed diffs remain `pending-external-review` and cannot be described as approved.
