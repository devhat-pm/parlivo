# @parlivo/desktop

The Tauri 2 desktop shell for macOS (universal DMG) and Windows (MSI/NSIS). It wraps the static export of `apps/web` and adds native microphone, camera and screen-recording permissions, deep-link OAuth (`parlivo://`), the system tray, global mute and push-to-talk hotkeys, and signed auto-updates (ARCHITECTURE.md section 6). The phase 0 WebView spike (WebRTC, AudioWorklet, screen capture in WKWebView and WebView2) decides whether Tauri stays.

Placeholder only: one window on `placeholder/index.html` and a unit-tested `app_name()`. Requires Rust 1.99.1 (pinned in `src-tauri/rust-toolchain.toml`) and, on Linux, the WebKitGTK development packages listed in `.github/workflows/ci.yml`.

```bash
pnpm --filter @parlivo/desktop rust:fmt     # rustfmt --check
pnpm --filter @parlivo/desktop rust:lint    # clippy, warnings are errors
pnpm --filter @parlivo/desktop rust:test
pnpm --filter @parlivo/desktop rust:build
pnpm --filter @parlivo/desktop tauri dev    # run the shell
```
