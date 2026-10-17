# Guided path: create and export a small game

1. Start Nova_A and choose **Platformer**. Name the project and create it.
2. In Scene, frame Player and Ground. Inspect Transform2D, Sprite/Shape renderer, RigidBody2D, Collider2D, CharacterBody2D, Animator, AudioSource, and Script2D.
3. Open Settings → Input Map. Confirm MoveHorizontal and Jump bindings; add a gamepad binding if needed.
4. Press Play, move and jump, Pause, Step one fixed tick, inspect contacts/velocity in Debug, then Stop to restore authoring state.
5. Adjust one safe property, save, close, reopen, and verify it. Run project tests from Debug.
6. Open Build Settings. Keep Main as startup scene, select Web for the portable browser path, choose Release and Validate cache, then review all diagnostics.
7. Build. Serve the output over HTTP(S), open `player.html`, test input/audio/UI, and check console/network for errors.
8. Repeat with Windows on a Windows host if desired. Verify release hashes, package lock, size/dependency reports, and a clean-machine launch before distribution.

The project uses metres/world units: moving an object by 10 in the Inspector moves it by exactly ten grid units. Save source separately from generated imports, cache, builds, and user-local settings.
