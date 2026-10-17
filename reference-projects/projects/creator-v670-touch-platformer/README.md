# Nova_A 6.7 no-code touch platformer

Engine **6.7.0** · Project Format 2/schema 29 · no Script2D component and no script asset.

Open Game view and press Play. Move with **A/D**, left gamepad axis, or the safe-area-aware virtual stick. Jump with **Space**, gamepad button 0, tap, or the virtual Jump button. The existing PlatformController2D component drives the same named actions, so this proves touch controls do not need code. Rotate Mobile portrait/landscape in Settings → Devices & mobile input; the controls must stay inside the safe area. Remap MoveHorizontal or Jump, calibrate axis 0, save/reload, and confirm all inputs still operate the same component.

In Presentation → Accessibility, traverse by keyboard/gamepad, test 200%, 300%, and 400% text, high contrast, reduced motion, RTL, English/German/Chinese, then export semantic evidence. Android remains optional: enable Nova Android Export and open Build → Platform. With no toolchain, the exact missing JDK/SDK/NDK/template list is the expected honest result. With a qualified local toolchain, Build must create an APK before explicit device install/log actions become available.
