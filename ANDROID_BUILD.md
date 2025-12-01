# Android Build Guide

## Building APK for Android Installation

### Option 1: EAS Build (Recommended - Easiest)

1. **Install EAS CLI** (if not already installed):
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure EAS Build**:
```bash
eas build:configure
```

4. **Build APK for Android**:
```bash
eas build --platform android --profile preview
```

This will build an APK that you can download and install on any Android device.

### Option 2: Local Build (Advanced)

1. **Install Android Studio** and set up Android SDK

2. **Set environment variables**:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

3. **Generate Android project**:
```bash
npx expo prebuild --platform android
```

4. **Build APK**:
```bash
cd android
./gradlew assembleRelease
```

5. **Find APK**:
The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Option 3: Using Expo Go (For Testing Only)

1. **Install Expo Go** on your Android device from Google Play Store

2. **Start development server**:
```bash
bun start
```

3. **Scan QR code** with Expo Go app

**Note**: This only works for testing, not for production distribution.

## Installing APK on Android Device

### Method 1: Via USB (ADB)
```bash
adb install path/to/your-app.apk
```

### Method 2: Direct Download
1. Upload APK to cloud storage (Google Drive, Dropbox, etc.)
2. Download on Android device
3. Enable "Install from Unknown Sources" in Settings
4. Tap the downloaded APK to install

### Method 3: Via Web Interface (Not Available in Expo)
Expo does not support generating APKs through a web interface. You must use EAS Build CLI or local builds.

## Current Build Configuration

The app is configured with:
- **Expo SDK**: 53
- **React Native**: 0.76.7
- **Platform**: iOS & Android
- **Bundle Identifier**: Should be configured in app.json

## Important Notes

1. **For Production**: You'll need to sign the APK with a keystore
2. **Google Play**: Requires AAB format, not APK: `eas build --platform android --profile production`
3. **First Build**: May take 15-20 minutes
4. **Subsequent Builds**: Usually faster (~5-10 minutes)

## Troubleshooting

### Build Fails
- Check `eas.json` configuration
- Ensure all dependencies are properly installed
- Check for any native module compatibility issues

### APK Won't Install
- Enable "Install from Unknown Sources"
- Check Android version compatibility (minimum SDK version)
- Ensure device has enough storage space

### App Crashes on Android
- Check logs: `adb logcat`
- Verify all native dependencies are compatible with Android
- Test on Android emulator first

## Quick Command Summary

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build Preview APK (installable on any Android device)
eas build --platform android --profile preview

# Build Production AAB (for Google Play Store)
eas build --platform android --profile production

# Check build status
eas build:list
```

## Download Built APK

After `eas build` completes:
1. Go to the Expo dashboard URL shown in terminal
2. Download the APK file
3. Transfer to Android device and install

Or use direct download link provided by EAS Build in terminal output.
