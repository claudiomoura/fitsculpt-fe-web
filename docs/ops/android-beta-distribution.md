# Android beta distribution (no local IDE)

This setup packages the existing FitSculpt web app inside a Capacitor Android shell and builds installables in GitHub Actions.

## What this gives you today

- `APK (debug, unsigned)` for quick private testing with trusted users.
- Optional `AAB (release, unsigned)` artifact for later signed distribution.
- No Android Studio and no Mac required.

## One-time setup

1. Open GitHub repository settings.
2. Go to **Settings -> Secrets and variables -> Actions -> Variables**.
3. Create repository variable `CAPACITOR_SERVER_URL` with your production web URL (HTTPS), for example `https://your-fitsculpt-web-url`.

If you do not set it, workflow dispatch defaults to `https://example.com` and the app shell will open that URL.

## Build APK from GitHub UI

1. Go to **Actions**.
2. Select workflow **Android Beta Build**.
3. Click **Run workflow**.
4. Choose branch (`dev` recommended for beta).
5. Fill `server_url` with your real web URL (or keep default if repository variable is set).
6. Keep `include_aab` as `true` only if you also want the unsigned `.aab`.
7. Click **Run workflow**.

## Download artifact

1. Open the finished workflow run.
2. In **Artifacts**, download `fitsculpt-android-debug-apk`.
3. Extract zip and get `app-debug.apk`.

## Send and install for trusted testers

1. Send `app-debug.apk` via trusted channel (Drive private link, Telegram private group, etc.).
2. Tester opens APK on Android device.
3. When prompted, allow install from that source.
4. Install and open FitSculpt.

## Known limitations

- This is a WebView wrapper of your web app, not a native offline app.
- App requires network and depends on the configured `server_url` availability.
- Debug APK is unsigned for store distribution; use only with trusted beta users.
- Some deep links, push notifications, or native features are not configured in this first setup.

## Branding assets (logo/icon) for Android shell

- Launcher icon and splash are taken from Android native resources under `apps/web/android/app/src/main/res`.
- Current source-of-truth logo files in repo:
  - `apps/web/public/logo.png` (launcher icon base)
  - `apps/web/public/fitsculpt-logo-transparent.png` (splash + shell fallback)
- `npm run mobile:android:sync` copies `webDir` (`apps/web/capacitor-shell`) into Android assets, but does not regenerate launcher/splash resources.
- If branding is updated, regenerate icon/splash assets in `apps/web/android/app/src/main/res` before running workflow.

Quick local verification before CI:

1. `cd apps/web`
2. `npm run mobile:android:prepare`
3. Build and install debug APK from Android module (`./gradlew assembleDebug` in `apps/web/android`) and verify:
   - Launcher icon shows FitSculpt logo.
   - Splash shows centered FitSculpt logo.
   - Shell fallback (`Loading FitSculpt...`) shows logo when offline/URL unavailable.

## Safety notes

- Share APK only with trusted users.
- Prefer private groups and avoid public links.
- Revoke old APK links when rotating beta versions.

## When you need signed distribution

For broader distribution (or Play Console), add Android signing with a keystore and GitHub encrypted secrets. Keep that as a separate hardening step from this quick beta pipeline.
