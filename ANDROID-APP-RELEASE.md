# QuickTools24 Android App — release preparation

## App identity
- App name: QuickTools24
- Suggested Android application ID: `in.quicktools24.app` (confirm availability before publishing)
- Website origin: https://quicktools24.in/
- App approach: Android Trusted Web Activity (TWA) backed by the existing website, so the same tools and UI stay in sync.

## Website foundation
- [x] Web app manifest
- [x] Service worker registration and offline navigation fallback
- [ ] Verify installability and manifest icons (192x192 and 512x512 PNG still required for the final Android package)
- [ ] Verify every tool flow in Android Chrome and on a small-screen device

## Android / Play Store steps
1. Generate the signed Android App Bundle (AAB) using Bubblewrap/TWA or Android Studio.
2. Create the app in Google Play Console and complete the store listing.
3. Enable Play App Signing and obtain the App Signing certificate SHA-256 fingerprint.
4. Publish `/.well-known/assetlinks.json` containing the exact package ID and Play App Signing SHA-256 fingerprint. Do not guess this fingerprint.
5. Verify Digital Asset Links and TWA opens in verified full-screen mode.
6. Complete privacy policy, Data safety, content rating, target audience, ads declaration, app access and screenshots.
7. Upload the AAB to Internal testing, test on real Android devices, then submit for review.

## Important
- This repository change does not itself create or publish an APK/AAB.
- The Play Console account owner must complete account verification, accept declarations and approve submission.
- Keep file processing and download flows tested before release. Do not claim offline PDF/image processing: the offline page is only a fallback.
