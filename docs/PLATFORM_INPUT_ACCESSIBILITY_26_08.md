# Nova_A 26.08 platform input and accessibility contract

Nova_A 26.08 keeps Project Format 2/schema 29 and the version-1 input recording format unchanged. Existing keyboard, mouse, touch, gesture, sensor and gamepad bindings continue to load. Pen support is additive.

## One action path

Gameplay continues to consume named actions rather than device events. An action may now use these pen binding channels:

| Binding device | Codes | Runtime value |
| --- | --- | --- |
| `pen-button` | `tip`, `barrel`, `eraser`, `button-0` through `button-31` | `0` or `1` |
| `pen-pressure` | `pressure` | clamped `0` through `1` |
| `pen-tilt` | `x`, `y` | clamped `-1` through `1`; browser degrees divided by 90 |
| `pen-twist` | `twist` | clamped `0` through `1`; browser degrees divided by 359 |

Pointer events whose `pointerType` is `pen` provide position, pressure, tilt, twist and buttons. The eraser follows the standard eraser button/mask. Pen-generated compatibility mouse events pass through the same short, local deduplication window as touch-generated mouse events, so one physical stroke cannot trigger two actions.

The active prompt changes only after meaningful activity. Keyboard presses, accepted mouse input, touch activity and pen movement/pressure update immediately. Gamepad axes must exceed the calibrated `0.35` activity threshold, preventing ordinary stick drift from replacing the current prompt. Gamepads are read once per gameplay sample regardless of the number of bindings.

## Keyboard layout choice

The binding capture control distinguishes two authoring choices:

- **Logical key (layout aware)** stores `KeyboardEvent.key`. Choose this when the printed character should follow QWERTY, QWERTZ, AZERTY or another active layout.
- **Physical key position** stores `KeyboardEvent.code`. Choose this when the same physical location should perform the action on every layout.

Legacy `keyboard` bindings containing physical codes such as `KeyA`, `ArrowLeft` or `Space` remain accepted. New physical captures use the explicit `physical-key` device, so projects can make the distinction without a migration.

## Safe cancellation and recording

Blur, hidden-document, page-hide, touch cancellation, pen cancellation and lost pointer capture release transient keys, mouse buttons, touches, pens, gestures and virtual controls. Prior action state is retained until the next sample so `released` and interaction cancellation remain observable. Stopping the manager still performs the original complete reset. Recorded snapshots remain version 1 and accept normalized legacy device identities; pen identities use `kind: "pen"`, ID `pen:0` and mapping `pointer`.

## Device authoring

The Devices panel exposes a separate accessible name for each virtual control. This name is persisted independently of the visible label and is used by the existing runtime control overlay. Pen tip, barrel, eraser, pressure, X/Y tilt and twist can be added to the currently selected action without removing its other bindings.

Controller inventory refresh is event-driven on connect/disconnect, coalesced to one animation frame, and backed by a five-second visible-Gamepad-tab fallback. Capability refresh also follows viewport/orientation events. This keeps hot-plug behavior reliable without a permanent one-second reactive redraw.

Motion sensor events obey the persisted sampling frequency. The frequency is normalized to 1–120 Hz, applied independently to orientation and motion channels with a monotonic gate, and suspended while the page is hidden. Disabling sensors detaches their listeners; restoring a visible, permission-granted session safely reattaches them.

## Platform delivery boundaries

Windows and Web remain the locally qualified targets. Linux and macOS remain matching-host builds. Android remains an optional, toolchain-gated target: Project Health reports missing SDK/NDK/JDK tooling, manifest or signing inputs as blockers and does not fabricate a successful build. Motion sensors, vibration, orientation and other device capabilities are requested only through their explicit project permissions. Real-phone behavior, store acceptance and publisher signing remain external until they are actually exercised.

## Semantic accessibility

Every reachable Web control publishes its semantic role, accessible name, description, state, value, focus order and bounds through ARIA or native HTML semantics; decorative visuals are hidden from the accessibility tree. Stable automation identities are structural and do not depend on translated labels. Keyboard-only operation, visible focus, high contrast, reduced motion, scalable text, RTL/IME input and locale-aware formatting are part of the browser layout and interaction gates in English, German and Chinese. Native assistive-technology and real screen-reader observation remain explicit external qualification instead of being claimed from source inspection.

## Verification

Run:

```powershell
node scripts/verify-v26.08-platform-input.mjs
pnpm check
```

The focused verifier executes behavior for pen channels and cancellation, logical/physical/legacy keys, lifecycle release, gamepad drift and one-read sampling, device/recording normalization, sensor timing, accessible names, compatibility-event deduplication and pen prompts. Browser, hardware, screen-reader and matching-host qualification remain separate release gates and must not be inferred from this deterministic verifier.
