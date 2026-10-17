# 26.21 observed panel findings

This is a development audit, not a release qualification. The latest broad traversal ran Midnight Blue, three locales and the recorded preflight sizes/scales. It visited 262 panel states plus 27 Settings matrix cases. Detailed screenshots and observations remain in `release-audits/v26.21-panels-midnight-blue-preflight.json`.

## Corrected readability defects

- Independent inspector X/Y edits previously merged into one Undo. The actual-input regression now passes.
- Settings help and inspector property labels/units did not scale with controls. They now follow application text scale.
- Numeric UI/audio fields, locale entry, signal/callback names, annotations and asset search had inadequate character capacity. The corrected-font traversal records 0 remaining short input/textarea findings in its visited states.
- Hierarchy header actions overlapped and filters starved the list at large text. Header wrapping and bounded scrolling preserve the controls.
- Hierarchy names could shrink to zero width and virtual rows stayed at 29px while buttons grew. Row height now follows scale, name space is reserved, and horizontal scrolling retains all actions. Virtual spacer padding also enlarged the scroll container itself; it now lives in an inner rows wrapper. The actual-input 5,001-entity test passes at 200% scale, reaching and selecting the final row with only 15 rows rendered. Loading remains slow and is tracked separately.

## Still open

The corrected canvas font exposes 74 states with selected-option text clipping in native selects. These are retained findings, not silently treated as passing because input capacity improved. Opening a native dropdown can expose its full options, but full-value discoverability and readability need actual interaction checks before this finding is closed.

| State | Overflow findings | Overlap findings | Shell contained |
|---|---:|---:|---|
| midnight-blue en Manage settings 1024x640 150% | 1 | 0 | true |
| midnight-blue en Manage settings 1024x640 200% | 5 | 0 | true |
| midnight-blue en workspace 6/6 1024x640 150% | 1 | 0 | true |
| midnight-blue en workspace 6/6 1024x640 200% | 5 | 0 | true |
| midnight-blue en Script inspector 7/10 800x720 1024x640 200% | 1 | 0 | true |
| midnight-blue en bottom panel 2/8 1024x640 150% | 2 | 0 | true |
| midnight-blue en bottom panel 2/8 1024x640 200% | 2 | 0 | true |
| midnight-blue en bottom panel 4/8 1024x640 150% | 2 | 0 | true |
| midnight-blue en bottom panel 4/8 1024x640 200% | 2 | 0 | true |
| midnight-blue en bottom panel 7/8 1024x640 200% | 1 | 0 | true |
| midnight-blue en page 3/4 1024x640 150% | 2 | 0 | true |
| midnight-blue en page 3/4 1024x640 200% | 2 | 0 | true |
| midnight-blue en page 4/4 1024x640 150% | 2 | 0 | true |
| midnight-blue en page 4/4 1024x640 200% | 2 | 0 | true |
| midnight-blue de Design 1024x768 1024x640 150% | 2 | 0 | true |
| midnight-blue de Design 1024x768 1024x640 200% | 3 | 0 | true |
| midnight-blue de workspace 1/6 1024x640 150% | 2 | 0 | true |
| midnight-blue de workspace 1/6 1024x640 200% | 3 | 0 | true |
| midnight-blue de workspace 3/6 1024x640 200% | 2 | 0 | true |
| midnight-blue de workspace 4/6 1024x640 200% | 1 | 0 | true |
| midnight-blue de workspace 6/6 1024x640 150% | 1 | 0 | true |
| midnight-blue de workspace 6/6 1024x640 200% | 5 | 0 | true |
| midnight-blue de Script inspector 7/10 800x720 1024x640 200% | 1 | 0 | true |
| midnight-blue de UI workspace 1/3 1024x640 200% | 1 | 0 | true |
| midnight-blue de UI workspace 2/3 1024x640 200% | 1 | 0 | true |
| midnight-blue de UI workspace 3/3 1024x640 200% | 1 | 0 | true |
| midnight-blue de bottom panel 1/8 1024x640 200% | 1 | 0 | true |
| midnight-blue de bottom panel 2/8 1024x640 150% | 2 | 0 | true |
| midnight-blue de bottom panel 2/8 1024x640 200% | 3 | 0 | true |
| midnight-blue de bottom panel 3/8 1024x640 200% | 2 | 0 | true |
| midnight-blue de bottom panel 4/8 1024x640 150% | 2 | 0 | true |
| midnight-blue de bottom panel 4/8 1024x640 200% | 3 | 0 | true |
| midnight-blue de bottom panel 5/8 1024x640 200% | 1 | 0 | true |
| midnight-blue de bottom panel 6/8 1024x640 200% | 1 | 0 | true |
| midnight-blue de bottom panel 7/8 1024x640 200% | 2 | 0 | true |
| midnight-blue de bottom panel 8/8 1024x640 200% | 1 | 0 | true |
| midnight-blue de page 1/4 1024x640 200% | 1 | 0 | true |
| midnight-blue de page 2/4 1024x640 200% | 1 | 0 | true |
| midnight-blue de page 3/4 1024x640 150% | 2 | 0 | true |
| midnight-blue de page 3/4 1024x640 200% | 3 | 0 | true |
| midnight-blue de page 4/4 1024x640 150% | 2 | 0 | true |
| midnight-blue de page 4/4 1024x640 200% | 3 | 0 | true |
| midnight-blue zh Design 1024x768 1024x640 150% | 2 | 0 | true |
| midnight-blue zh Design 1024x768 1024x640 200% | 2 | 0 | true |
| midnight-blue zh workspace 1/6 1024x640 150% | 2 | 0 | true |
| midnight-blue zh workspace 1/6 1024x640 200% | 2 | 0 | true |
| midnight-blue zh workspace 6/6 1024x640 150% | 1 | 0 | true |
| midnight-blue zh workspace 6/6 1024x640 200% | 5 | 0 | true |
| midnight-blue zh bottom panel 2/8 1024x640 150% | 2 | 0 | true |
| midnight-blue zh bottom panel 2/8 1024x640 200% | 2 | 0 | true |
| midnight-blue zh bottom panel 4/8 1024x640 150% | 2 | 0 | true |
| midnight-blue zh bottom panel 4/8 1024x640 200% | 2 | 0 | true |
| midnight-blue zh page 3/4 1024x640 150% | 2 | 0 | true |
| midnight-blue zh page 3/4 1024x640 200% | 2 | 0 | true |
| midnight-blue zh page 4/4 1024x640 150% | 2 | 0 | true |
| midnight-blue zh page 4/4 1024x640 200% | 2 | 0 | true |
| en Settings 1024x640 150% | 1 | 0 | true |
| en Settings 1366x768 150% | 1 | 0 | true |
| en Settings 1920x1080 150% | 1 | 0 | true |
| en Settings 1024x640 200% | 5 | 0 | true |
| en Settings 1366x768 200% | 7 | 0 | true |
| en Settings 1920x1080 200% | 7 | 0 | true |
| de Settings 1024x640 150% | 1 | 0 | true |
| de Settings 1366x768 150% | 1 | 0 | true |
| de Settings 1920x1080 150% | 1 | 0 | true |
| de Settings 1024x640 200% | 5 | 0 | true |
| de Settings 1366x768 200% | 7 | 0 | true |
| de Settings 1920x1080 200% | 7 | 0 | true |
| zh Settings 1024x640 150% | 1 | 0 | true |
| zh Settings 1366x768 150% | 1 | 0 | true |
| zh Settings 1920x1080 150% | 1 | 0 | true |
| zh Settings 1024x640 200% | 5 | 0 | true |
| zh Settings 1366x768 200% | 5 | 0 | true |
| zh Settings 1920x1080 200% | 5 | 0 | true |

The 81-surface structural inventory and its 1,610 conditions remain the coverage checklist. A visited empty panel does not exercise every conditional asset, entity, dialog or runtime state. The complete five-palette qualification and independent accessibility checks remain pending.

## Completion-candidate response

The historical 74-state clipping list above is retained. Native selected values now have a wrapping full-value tooltip on keyboard focus and pointer hover. The updated traversal explicitly records each clipped value and tests that its hint displays the exact text completely within the viewport. Short input/textarea capacity now directly fails the layout gate. The final full five-palette release report, not the historical preflight alone, determines acceptance.

Navigation/floating follow-up: screenshot review of candidate 2 found context labels broken mid-word. The rail now uses text-scaled width and natural wrapping, with complete labels and scrolling; existing compact accessible icon mode remains. New actual-input tests also found and repaired floating height overflow and Workspace Manager Escape clearing selection. The new layout-user report checks focused resize/save/maximize and both visible floating/redock routes. Full matrix evidence is required on the final frozen candidate; a passing focused test does not close every conditional state.

Candidate 3 full Cloud Blue matrix: fourteen failing states, all contained geometrically. Twelve were four short paired profiler budget inputs at 1366x768 and enlarged text; two were two-pixel vertical clipping in German navigation at 150%. The next candidate gives profiler pairs full wrapping rows and navigation greater line height. The focused layout-user suite now exercises these exact cases; only fresh passing final evidence closes them.
