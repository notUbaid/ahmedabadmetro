# Android TWA Release Guide (Google Play Compliance: Android 16 / API 36)

This document details the configuration and build instructions for the native Android package (`.aab`) of **AhmMetro** (`ahmedabadmetro.site`), fully compliant with Google Play's **Android 16 (API 36)** target requirement and all quality recommendations.

---

## 📋 Google Play Compliance Checklist

| Item | Google Play Requirement | Implementation in AhmMetro | Status |
|---|---|---|:---:|
| **Target SDK** | Must target Android 16 (API 36) or higher | `targetSdkVersion 36`, `compileSdkVersion 36` in `android/app/build.gradle` | ✅ Compliant |
| **Version Code** | Must be higher than previous production release | `versionCode 14`, `versionName "1.2.2.14"` | ✅ Updated |
| **Edge-to-Edge** | App must display edge-to-edge on Android 15+ (API 35/36) | Web viewport has `viewport-fit=cover` and CSS handles `env(safe-area-inset-*)`. AndroidBrowserHelper handles window insets. | ✅ Compliant |
| **Orientation & Resizability** | No locked portrait orientation on tablets/foldables | Web manifest sets `orientation: "any"`. AndroidManifest sets `android:screenOrientation="unspecified"` and `android:resizeableActivity="true"`. | ✅ Compliant |
| **Code & Resource Shrinking** | Enable R8 optimization for performance | Configured `minifyEnabled true` in release build type. | ✅ Compliant |
| **Release Signing** | Valid release key matching existing Play Store cert | Signed with `signingKey.keystore` (alias: `my-key-alias`, SHA256: `7D:8F:03:9D:A6:EE:F9:4C:22:29:58:EC:78:90:CD:63:44:42:F5:1F:BE:6D:30:88:91:CB:E0:8E:AC:86:56:33`). Matches `/.well-known/assetlinks.json`. | ✅ Verified |

---

## 💻 Project Structure

The Android project is committed in the `/android` directory:

```text
android/
├── app/
│   ├── build.gradle          # Target SDK 36, versionCode 14, signing config
│   └── src/main/
│       ├── AndroidManifest.xml # TWA launcher & resizability
│       └── res/              # App icons, splash screens, shortcuts
├── gradle/wrapper/           # Gradle 8.11.1 wrapper
├── build.gradle              # Android Gradle Plugin 8.9.1
├── gradle.properties
└── signingKey.keystore       # Keystore for release signing (git-ignored)
```

---

## 🛠️ Prerequisites to Build

1. **Java Development Kit**: JDK 17 or JDK 21 LTS (e.g. `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`).
   *(Note: JDK 25 is too new for Gradle 8.11; JDK 21 LTS is used).*
2. **Android SDK**: With `platforms;android-36` and `build-tools;35.0.0` or `36.0.0` installed.

---

## 🚀 How to Build the Release Bundle (.aab)

From PowerShell or terminal in the repository root:

```powershell
# Set environment variables (if not already in PATH)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

# Navigate to android folder and build release bundle
cd d:\Projects\ahmedabadmetro\android
.\gradlew.bat bundleRelease
```

The signed output bundle will be generated at:
- `android/app/build/outputs/bundle/release/app-release.aab`
- A convenience copy is placed in the project root: `AhmMetro-v14-API36.aab`

To verify the target SDK and version code with `aapt2`:
```powershell
& "$env:ANDROID_HOME\build-tools\36.0.0\aapt2.exe" dump badging android/app/build/outputs/apk/release/app-release.apk
# Verify: versionCode='14' compileSdkVersion='36' targetSdkVersion='36'
```

---

## 📤 Step-by-Step Google Play Console Upload

1. Log in to [Google Play Console](https://play.google.com/console).
2. Select the **AhmMetro** application.
3. On the left sidebar, navigate to **Release** $\rightarrow$ **Production** (or **Closed testing** first if preferred).
4. Click **Create new release** in the top right.
5. In the **App bundles** section, click **Upload** and select:
   `d:\Projects\ahmedabadmetro\AhmMetro-v14-API36.aab`
   *(or `android/app/build/outputs/bundle/release/app-release.aab`)*.
6. Verify the details:
   - Version code: **14**
   - Target SDK: **Android 16 (API 36)**
7. Enter release notes (e.g., *"Updated app to target Android 16 (API 36), enhanced tablet/foldable compatibility, and overall performance improvements."*).
8. Click **Next** / **Save**, then review and click **Start rollout to Production** (100%).
9. Once Google Play processes and approves the release, the **Policy Status** warning for Android 16 will automatically resolve!
