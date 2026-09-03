# Android TWA Release Guide (Google Play Compliance: Android 15 & 16)

This document details the configuration required to build the native Android package (`.aab`) for **AhmMetro** (`ahmedabadmetro.site`), fully compliant with Google Play's **Android 16 (API 36)** target requirement and all **4 recommended quality actions**.

---

## 📋 Google Play 4 Actions Checklist

| Action Item | Google Play Requirement | Resolution in AhmMetro |
|---|---|---|
| **Action 1: Edge-to-Edge** | App must display edge-to-edge on Android 15+ (API 35/36) | Web viewport has `viewport-fit=cover` and CSS handles `env(safe-area-inset-*)`. Android uses `EdgeToEdge.enable()`. |
| **Action 2: Deprecated Window APIs** | Avoid `setStatusBarColor` and `setNavigationBarColor` | Upgraded to `com.google.androidbrowserhelper:androidbrowserhelper:2.5.0+` which migrates away from deprecated APIs. |
| **Action 3: Resizability & Orientation** | No locked portrait orientation on tablets/foldables (Android 16+) | Web App Manifest sets `orientation: "any"`. AndroidManifest sets `android:screenOrientation="unspecified"` and `android:resizeableActivity="true"`. |
| **Action 4: R8 Optimization & Shrinking** | Enable R8 code & resource shrinking for memory efficiency | Configured `minifyEnabled true`, `shrinkResources true`, and `proguard-rules.pro`. |

---

## 🛠️ Step 1: PWABuilder Packaging Options

When packaging via [PWABuilder](https://www.pwabuilder.com):

* **Package ID**: `ahmedabadmetro.site` *(Do NOT use site.ahmedabadmetro.www.twa)*
* **App Name**: `AhmMetro`
* **Short Name**: `AhmMetro`
* **Host**: `www.ahmedabadmetro.site`
* **Start URL**: `/`
* **Display Mode**: `standalone`
* **Orientation**: `any` *(Fixes Action 3)*
* **Version Code**: `13` *(or higher than current production release 12)*
* **Version**: `1.2.2.13`
* **Location Delegation**: ☑️ **Checked** *(Enables Android OS GPS permission delegation)*
* **Include Source Code**: ☑️ **Checked**
* **Signing Key**: Use existing keystore from Release 1

---

## 💻 Step 2: `app/build.gradle` Configuration

If modifying or building from the source code zip:

```groovy
plugins {
    id 'com.android.application'
}

android {
    namespace 'ahmedabadmetro.site'
    compileSdk 36 // Targets Android 16 (Google Play Mandate)

    defaultConfig {
        applicationId "ahmedabadmetro.site"
        minSdk 21
        targetSdk 36 // Targets Android 16 (Fixes Target API warning)
        versionCode 13
        versionName "1.2.2"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            // Action 4: Enable R8 code optimization & resource shrinking
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    // Action 1 & 2: Upgraded Android Browser Helper (Edge-to-Edge compliant)
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
    implementation 'androidx.browser:browser:1.8.0'
    implementation 'androidx.core:core-splashscreen:1.0.1'
}
```

---

## 📄 Step 3: `AndroidManifest.xml` Configuration

In `app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Location permissions for GPS delegation -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/appName"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AhmMetro">

        <activity
            android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:exported="true"
            android:resizeableActivity="true"
            android:screenOrientation="unspecified">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="https"
                    android:host="www.ahmedabadmetro.site" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 🚀 Step 4: Build & Upload to Google Play

1. Build release bundle:
   ```bash
   ./gradlew bundleRelease
   ```
2. The output bundle will be located at:
   `app/build/outputs/bundle/release/app-release.aab`
3. Upload to **Google Play Console $\rightarrow$ Production $\rightarrow$ Create release**.
