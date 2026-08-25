# Nova_A 4.8 materials and shaders

Material assets are reusable `.nova-mat` resources. Select one in Assets or open **Manage → Rendering → Materials/Shaders** to edit color, texture, blend mode, parent material, uniforms, includes, and shader source.

The inspector reflects declared `float`, `int`, vectors, colors, textures, ranges, enums, and toggles into typed controls. `#include <name>` resolves only declared entries from the bounded include library. Missing, recursive, oversized, or unsupported sources produce line-oriented diagnostics. Saving performs compile preview and platform validation; hot reload replaces the runtime program only after a successful compile.

Every compile failure or unsupported platform path records the material reference, reason, time, and an actionable fix. The event history is bounded. The safe fallback is the documented default material and is never silent. Project Health links shader failures to Rendering; Build Diagnostics blocks unresolved errors.

WebGL2 is the shader contract for web and desktop WebView paths. Canvas2D is diagnostic-only for custom materials. Validate both `web` and `native-windows` targets before release. Golden output still requires a representative physical device/browser run; a local compiler result is not labeled a GPU golden image.
