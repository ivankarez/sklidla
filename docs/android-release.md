# Android release process

Sklidla ships Android builds **without Expo's online build service**.

That means:

- **Google Play** gets a signed **AAB**
- **GitHub Releases** gets a signed **APK**
- both artifacts come from the same release commit

## Current release baseline

- Android package: `com.sklidla.app`
- Expo app version: `expo.version` in `app.json`
- Android version code: `expo.android.versionCode` in `app.json`
- Native project: committed `android/`

## One-time local machine setup

### 1. Install toolchains

You need:

- Node/npm
- JDK 17
- Android SDK with platform/build tools required by the generated Gradle project

Export the usual Android environment variables before running Gradle locally:

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

### 2. Create the upload keystore

Generate a release/upload keystore once and store it outside git:

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore android/keystores/sklidla-upload.keystore \
  -alias sklidla-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 3. Create `android/keystore.properties`

Copy the example file:

```bash
cp android/keystore.properties.example android/keystore.properties
```

Then set the real values:

```properties
storeFile=keystores/sklidla-upload.keystore
storePassword=your-store-password
keyAlias=sklidla-upload
keyPassword=your-key-password
```

`android/keystore.properties` and the keystore itself are ignored by git on purpose.

### 4. Enroll in Google Play App Signing

For Play releases, use **Google Play App Signing**.

The keystore above is your **upload key**, not Google's final distribution key. Keep it backed up somewhere safe.

## When to rerun Expo prebuild

Run this when you change Expo config that affects native Android output, such as:

- `app.json` Android settings
- native Expo plugins
- app name/icon/splash settings that must sync into the native project

Command:

```bash
npm run android:prebuild
```

Review the generated native diff before releasing.

## Version bump checklist

Before every release:

1. Update `expo.version` in `app.json`
2. Increment `expo.android.versionCode` in `app.json`
3. Commit the version bump before building release artifacts

**Rules:**

- `versionCode` must increase for every Play upload
- `version` is the user-visible version string

## Quality gate

Run the repo checks before building release artifacts:

```bash
npm run lint
npm test
```

## Build the Google Play artifact

Build the signed Android App Bundle:

```bash
npm run android:release:aab
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

This is the file you upload to **Google Play Console**.

## Build the GitHub Release APK

Build the signed APK:

```bash
npm run android:release:apk
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

This is the file you attach to the **GitHub Release page** for direct downloads.

## Full local release flow

From a clean release branch/tag:

1. Update `app.json` version fields
2. Run `npm run android:prebuild` if native config changed
3. Run `npm run lint`
4. Run `npm test`
5. Run `npm run android:release`
6. Upload `android/app/build/outputs/bundle/release/app-release.aab` to Google Play Console
7. Create or publish the GitHub Release for the same tag
8. Attach `android/app/build/outputs/apk/release/app-release.apk` to that GitHub Release if automation is not doing it already

## Google Play submission steps

For each release:

1. Open the app in Google Play Console
2. Go to the target testing/production track
3. Create a new release
4. Upload `app-release.aab`
5. Review release notes, rollout track, and app-content requirements
6. Submit the release

## GitHub Release automation

This repo includes `.github/workflows/android-release.yml`.

What it does:

1. Runs on **published GitHub Releases** or manual dispatch
2. Builds the signed APK and signed AAB with the native Android toolchain
3. Uploads both files as workflow artifacts
4. Attaches the APK to the GitHub Release page

### Required GitHub secrets

Add these repository secrets before using the workflow:

- `ANDROID_UPLOAD_KEYSTORE_BASE64`
- `ANDROID_UPLOAD_STORE_PASSWORD`
- `ANDROID_UPLOAD_KEY_ALIAS`
- `ANDROID_UPLOAD_KEY_PASSWORD`

Create the base64 secret from the same upload keystore used locally:

```bash
base64 < android/keystores/sklidla-upload.keystore | tr -d '\n'
```

Paste that value into `ANDROID_UPLOAD_KEYSTORE_BASE64`.

### Manual workflow dispatch

If you want to rebuild artifacts for an existing tag, run the workflow manually and pass the release tag.

The workflow will:

- build from that tag
- upload the APK to the matching GitHub Release
- keep the AAB available as a workflow artifact for Play upload or archiving

## Failure modes worth checking first

### Gradle says signing config is missing

Create `android/keystore.properties` from `android/keystore.properties.example`, or provide the `ANDROID_UPLOAD_*` environment variables.

### Google Play rejects the upload

Usually one of these:

- `versionCode` was already used
- the package ID does not match the Play listing
- the wrong artifact was uploaded (`.apk` instead of `.aab`)

### GitHub workflow cannot sign the APK

Usually one of these:

- the base64 keystore secret is malformed
- key alias/password values do not match the keystore
- the workflow secrets were not configured for the repository

## Post-release sanity check

After shipping:

1. Verify the Play track has the correct version/build
2. Download the APK from GitHub Releases
3. Install it on a test device
4. Confirm app launch, database access, camera access, and AI settings still work
