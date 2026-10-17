# Nova_A 6.7 Android delivery gate

Engine **6.7.0** · Project Format 2/schema 29.

This is the same playable no-code touch platformer with Android aarch64 selected, VIBRATE as its only permission, no implicit deployment, and no embedded credential. First enable the optional verified **Nova Android Export 6.7.0** package. Build is allowed only after live discovery finds JDK 17, Android SDK/API 35, build-tools, NDK, and a validated NOVA_A_ANDROID_TEMPLATE Gradle wrapper. Debug produces a debug APK. Manual release signing additionally needs a keystore path plus NOVA_ANDROID_KEYSTORE_PASSWORD, NOVA_ANDROID_KEY_ALIAS, and NOVA_ANDROID_KEY_PASSWORD in the local environment. Device install and logcat each require a separate click. Missing toolchain is a correct blocker, not a failed qualification.
