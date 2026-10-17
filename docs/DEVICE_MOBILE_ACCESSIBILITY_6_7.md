# Nova_A 6.7 device input, mobile delivery, and accessibility

Nova_A 6.7 adds one action-based device layer rather than parallel gameplay APIs. Keyboard, physical keys, mouse, touch, gestures, gamepads, virtual controls, and permitted sensors all resolve through the saved Input Map. Project Format 2/schema 29, Rhai API 2, Graph Format 1, Plugin API 2, Package Manifest 1, Build CLI 1, and workspace document 3 remain frozen.

## Device input contract

- Touch recognizes tap, double tap, long press, horizontal/vertical swipe, pan, pinch, rotation, and two-finger pan. A bounded 800 ms/32 px filter rejects compatibility mouse events generated from a recent touch.
- Virtual Button, Stick, and D-pad controls publish named action values through the existing InputManager. Multiple controls for one action are aggregated and clamped; pointer cancel, focus loss, component unmount, and scene exit release held values.
- Controls can anchor to each corner, apply safe-area insets, and configure offset, size, opacity, dead zone, scalar value, accessible name, and bounded haptic duration. They expose keyboard equivalents and accessible value text.
- Gamepad rebinding captures the first deliberate key, button, or axis input for a selected action. Axis calibration is per exact controller ID or wildcard and stores minimum, center, maximum, dead zone, and inversion.
- Sensor bindings use explicit codes such as `tilt-x`, `tilt-y`, `heading`, `acceleration-x`, and `rotation-z`. Motion/orientation listeners are not attached until the project enables sensors and the user clicks the permission request.
- Input recording and replay include the resolved device/action snapshot. Device settings persist under `projectSettings.deviceInput`; no schema number changed.

## Editor workflow

1. Open Settings → Devices & mobile input.
2. In Preview, choose a desktop/mobile preset, rotate it, and inspect safe-area and 44 × 44 target overlays.
3. In Virtual controls, enable the runtime overlay, add controls, bind saved action names, and set placement/feel.
4. In Gamepad, connect a controller, click Capture binding, operate one control, then add calibration if needed.
5. In Sensors, choose orientation policy, explicitly request sensor permission, inspect bounded values, and test haptics.
6. Play the game. The no-code PlatformController2D reference proves that virtual controls operate the same component as A/D, Space, and gamepad bindings.

## Android delivery contract

Android remains an optional Experimental target, not a Tier-1 claim.

Discovery requires all of the following before Build is enabled:

- JDK 17 via `JAVA_HOME/bin/java`;
- `ANDROID_SDK_ROOT` or `ANDROID_HOME`;
- Android platform/API 35, build-tools, NDK, and platform-tools/adb;
- `NOVA_A_ANDROID_TEMPLATE`, containing a Gradle wrapper and `app/build.gradle`;
- the verified optional Nova Android Export 6.7.0 package.

The native exporter copies the validated template, writes escaped least-permission `AndroidManifest.xml`, packages the Web player and `game.nova-pak`, copies authored icon/splash resources, writes non-secret build properties, then runs the template Gradle wrapper with `--offline --no-daemon`. It copies the matching debug/release APK only after Gradle succeeds. No APK is claimed when any discovery gate or Gradle execution fails; the exact blocker remains visible instead.

Debug/local builds do not serialize a secret. Manual release signing requires an existing keystore path plus `NOVA_ANDROID_KEYSTORE_PASSWORD`, `NOVA_ANDROID_KEY_ALIAS`, and `NOVA_ANDROID_KEY_PASSWORD` in the local environment. These values are never added to the project. Device serials and APK paths are validated; install and bounded 400-line logcat capture each require a separate user click.

Permissions must be well-formed `android.permission.*` identifiers. Runtime-sensitive permissions require a saved human-readable purpose. Nova_A recommends the reviewed catalog and warns on unknown permissions. The default reference uses only VIBRATE.

iOS remains deferred: a matching macOS host, Xcode, Apple signing, real devices, lifecycle qualification, and store review are required. Nova_A 6.7 does not claim an iOS build.

## Accessibility adapters and evidence

Canvas UI emits semantic DOM nodes with role, accessible name/description, disabled/current state, checkbox checked state, slider minimum/maximum/current value, value text, live-region priority, focus order, and runtime bounds. On Windows, WebView2 exposes standards-based DOM/ARIA semantics through Microsoft UI Automation. Nova_A does not claim a custom native provider in 6.7.

Presentation → Accessibility can export a deterministic, bounded `nova-semantic-accessibility-snapshot` JSON file. The audit checks names, roles, checkbox/slider values, live content, and duplicate explicit focus order. Test keyboard/gamepad traversal, screen reader output, high contrast, reduced motion, RTL, English/German/Chinese, and text/caption scaling at 200%, 300%, and 400%.

## Security and performance boundaries

No toolchain discovery downloads software. No device command, permission request, vibration, install, log capture, signing, or deployment occurs automatically. File paths, serials, identifiers, permissions, outputs, collection sizes, and command output are bounded. Gradle uses the validated local wrapper and offline mode.

Touch processing is O(active touches), virtual controls are bounded to 32, calibration profiles to 128, semantic nodes to 10,000, command output to 64,000 characters, and logcat to 400 lines. No existing animation or feature is removed.

## Qualification checklist

Programmer:

- type check, Rust tests, WASM release, Vite production, Tauri build;
- touch/pointer deduplication and gesture/action replay;
- virtual-control cancel/release and save/reload;
- gamepad remap and calibration boundaries;
- permission/manifest/identifier/serial/APK traversal corpus;
- Android clean build when the toolchain exists, otherwise exact blocker evidence;
- semantic snapshot roles/names/state/value/live/focus;
- 200–400% text, contrast, reduced motion, RTL, EN/DE/ZH layouts.

Normal user:

- finish the no-code touch platformer with keyboard, controller, touch, and gesture;
- rotate both mobile previews without clipped controls;
- remap a controller and save/reload;
- traverse with keyboard/screen reader and export evidence;
- produce/install an APK on a qualified host or receive the exact missing-toolchain list.

## External gates

Production Android signing, clean-device install/upgrade/uninstall, store review, physical touch/gamepad/audio/haptic/sensor devices, multiple Android versions/DPI/GPU/driver identities, Windows screen-reader review, matching-host platforms, independent security/accessibility review, and the real long-duration soak remain external and are not reported as completed by local automation.

