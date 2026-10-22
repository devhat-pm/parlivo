# @parlivo/desktop

The Tauri 2 desktop shell for macOS (universal DMG) and Windows (MSI/NSIS). It wraps the static export of `apps/web` and adds native microphone, camera and screen-recording permissions, deep-link OAuth (`parlivo://`), the system tray, global mute and push-to-talk hotkeys, and signed auto-updates (ARCHITECTURE.md section 6). The phase 0 WebView spike (WebRTC, AudioWorklet, screen capture in WKWebView and WebView2) decides whether Tauri stays.

In development the window loads the web app from `http://localhost:3100` (`build.devUrl`); release builds still point at `placeholder/` until the static-export prompt. The WebView spike (`docs/spikes/tauri-webview.md`) confirmed mic, camera, WebRTC publish and subscribe, AudioWorklet and screen capture in macOS WKWebView. `src-tauri/Info.plist` holds the camera and microphone usage strings macOS requires. Requires Rust 1.99.1 (pinned in `rust-toolchain.toml`) and, on Linux, the WebKitGTK development packages listed in `.github/workflows/ci.yml`.

```bash
pnpm --filter @parlivo/desktop rust:fmt     # rustfmt --check
pnpm --filter @parlivo/desktop rust:lint    # clippy, warnings are errors
pnpm --filter @parlivo/desktop rust:test
pnpm --filter @parlivo/desktop rust:build
pnpm --filter @parlivo/web exec next start -p 3100   # or next dev -p 3100
pnpm --filter @parlivo/desktop tauri dev    # run the shell against it
```
