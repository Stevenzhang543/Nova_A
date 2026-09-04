# Nova_A 26.08 release notes

Machine version: **26.8.0**. Project Format **2/schema 29**, Rhai API **2**, Visual Graph **1**, Plugin API **2**, Package Manifest **1**, Build CLI **1**, Network Protocol **2**, and Workspace document **3** remain compatible.

## Platform input and accessibility

- The action system now treats pen as a first-class, additive input source, including pressure, tilt, twist, eraser, barrel and contact bindings. Keyboard logical keys and physical scan positions remain distinct and can be captured explicitly.
- Keyboard, mouse, pen, touch, gestures, virtual controls, gamepads and permitted sensors update one runtime input-modality authority. Controller drift below the configured dead zone does not churn prompts.
- Focus loss, page hiding, visibility changes, pointer cancellation and device removal release held state. Sensor sampling obeys its configured frequency and remains permission gated.
- Device authoring exposes accessible virtual-control labels. Safe areas, rotation previews, remapping and calibration retain their project persistence and no-code action route.
- Semantic Web/Windows accessibility evidence, reduced motion, high contrast, RTL/IME, locale-aware formatting and 200–400% runtime text remain explicit qualification targets. Hardware and independent screen-reader observation remain external until recorded.

## Responsiveness and correctness

- Inactive management and bottom-panel tools load on demand. Optional warmup loads one chunk per idle opportunity and stops as soon as the user interacts; low-end devices skip speculative warmup.
- Asset cards use a bounded viewport window instead of an ever-growing prefix. Selection, drag/drop, search and Inspector behavior are unchanged.
- Package compatibility now reads the single engine-version authority, removing a stale 26.6.0 comparison that could reject current packages.
- Shared layout invariants keep controls contained under translation, scaling, touch targets and narrow windows without removing any animation or visual component.

## Honest boundaries

Android export remains optional and requires a matching local JDK/SDK/NDK/template/signing setup. Linux and macOS qualification requires those hosts. iOS, consoles, publisher signing, real devices, independent assistive-technology review, clean-machine lifecycle, second-machine reproduction, public-network review and a real 72-hour soak remain external.

