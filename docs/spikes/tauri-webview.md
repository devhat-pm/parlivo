# Spike: Tauri 2 WebView for the meeting screen

- Date: 2026-10-22
- Question: can the Tauri 2 shell run the real `/m/[meetingId]` meeting route on macOS WKWebView, including microphone and camera capture, WebRTC publish and subscribe, an AudioWorklet node, and screen capture? Tauri or Electron? (ARCHITECTURE.md section 6, prompt 2 B4)
- Environment: macOS 26.7.1 on Apple Silicon (MacBook Air), Tauri 2.12.5 / tauri-cli 2.12.4, wry 0.57.0, Rust 1.99.1, `tauri dev` build loading the production Next.js build from `http://localhost:3100`, LiveKit 1.13.10 from `infra/dev` with host networking. WebView user agent: `AppleWebKit/605.1.15 (KHTML, like Gecko)`.

**Recommendation: GO for Tauri.** Everything the meeting screen needs worked in WKWebView on the first real run, with no Tauri plugin, capability or Rust code. The open risks are on Windows (untested) and in packaging (static export, signing), not in WebKit's media stack.

## Method

1. Built `apps/web` with `NEXT_PUBLIC_DIAGNOSTICS_URL` set. That turns on an opt-in reporter (`apps/web/src/lib/diagnostics.ts`) which posts lobby and join steps, console errors and warnings, and a room snapshot every 2 s to a local receiver. Production builds never set it.
2. Launched the desktop app (`apps/desktop`) on the dev URL. A person clicked Start a dev meeting → Join meeting in the window and answered the macOS permission prompts.
3. A headless Chromium participant (`tests/e2e/scripts/join-bot.mjs`) joined the same meeting and reported what it received from the desktop app every 5 s.
4. Evidence came from both sides: the desktop app's own snapshots, filtered to the WKWebView user agent, and the bot's view of the desktop participant.

## Results

| Capability                         | Result    | Evidence                                                                                                                                                                                                |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getUserMedia` (mic + camera)      | **Works** | Lobby reported `audio:MacBook Air Microphone`, `video:MacBook Air Camera`. Switching to an iPhone (Continuity) microphone also worked.                                                                  |
| WebRTC publish                     | **Works** | Desktop snapshot `published: [microphone, camera]`; the bot had the desktop participant's audio and video subscribed for the whole run.                                                                 |
| WebRTC subscribe                   | **Works** | Desktop snapshot showed the bot's `audioSubscribed: true, videoSubscribed: true` in 15 consecutive snapshots. Rendering used `livekit-client`'s `track.attach()` on plain `<audio>`/`<video>` elements. |
| AudioWorklet node                  | **Works** | The `packages/audio` level meter (processor loaded from a Blob URL) reported a non-zero mic level in all 19 desktop snapshots, peak 0.261.                                                              |
| `getDisplayMedia` (screen capture) | **Works** | After clicking Share screen, the desktop snapshot showed `published: [microphone, camera, screen_share]` with no error, and the bot saw the screen-share track.                                         |

## What needed a permission, plugin or change

- **Tauri plugins and capabilities: none.** wry answers WKWebView's media-capture permission request itself, so no Rust code or `capabilities/*.json` entry was needed for camera, microphone or screen capture.
- **`src-tauri/Info.plist`** with `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`. macOS shows these strings in its permission prompts. A bundled app without them is killed by the system on first camera access, so they are required for release builds as well.
- **Screen capture** needs the macOS Screen Recording permission for the app and a user gesture. `getDisplayMedia` is only called from the Share screen button, never automatically.
- **Toolchain file location.** `rust-toolchain.toml` had to move from `src-tauri/` to `apps/desktop/`. The Tauri CLI runs from `apps/desktop`, could not find the pinned toolchain there, and panicked (`Option::unwrap()` on `None` in `tauri-cli/src/interface/rust.rs`) when `rustc --version` failed.
- **Lobby bug found and fixed.** Selecting a stored device with `deviceId: { exact }` raised `OverconstrainedError: Invalid constraint` in WKWebView after devices changed. The lobby now uses `ideal`, which falls back instead of failing.

## Issues seen but not resolved

- **First join hung once.** In the very first session the API join succeeded, but LiveKit never received a connection from the app and the window stayed on the spinner until it was closed. This was before the step reporter existed, so there is no evidence of the cause. All four later sessions connected within a second. Re-test on a clean launch with the reporter on, and add a connect timeout with a visible error to `connectToMeeting`.
- **Static export and dynamic routes.** The desktop release build will be a static export (`output: 'export'`), and Next.js cannot export the dynamic `/m/[meetingId]` route without known IDs. Before the desktop packaging prompt, move the desktop entry to a query-parameter route (`/m?id=...`) or a client-side router fallback. This spike loaded the route from the Next.js server, not from a static export.
- **Origin for the packaged app.** Packaged, the page is served from `tauri://localhost` (macOS) and `http://tauri.localhost` (Windows). The API's default CORS origins already include both. LiveKit needs no CORS change.

## Windows WebView2: not tested

This Mac cannot run WebView2. Verify on a Windows 11 machine before committing to Tauri for Windows:

1. `getUserMedia` for mic and camera, and the permission prompt WebView2 shows (wry should grant through `PermissionRequested`; confirm there is no silent deny).
2. WebRTC publish and subscribe against the dev stack, with `join-bot.mjs` as the second participant.
3. The AudioWorklet level meter loaded from a Blob URL under the app's CSP.
4. `getDisplayMedia`: WebView2 needs a recent runtime for screen capture; record the version and whether the picker appears.
5. Echo cancellation with speakers (WebView2 uses Chromium's AEC; compare with Chrome).
6. The MSI and NSIS installers with the Evergreen WebView2 bootstrapper, on a machine without WebView2 preinstalled.
7. Code signing (Windows certificate) does not affect media permissions.

## Tauri versus Electron

| Factor                    | Tauri 2                                                                 | Electron                                             |
| ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| Media features on macOS   | All five pass in this spike                                             | Bundled Chromium; known to work                      |
| Engine consistency        | WKWebView on macOS, WebView2 (Chromium) on Windows: two engines to test | One Chromium everywhere                              |
| Binary size and memory    | Small (no bundled browser)                                              | ~150 MB+ per app                                     |
| Native work needed so far | None beyond Info.plist strings                                          | Comparable (permission handlers in the main process) |
| Risk                      | Windows untested; WebKit and Chromium WebRTC differ in codecs and AEC   | Lower engine risk, heavier distribution              |

Decision: **stay with Tauri** (ARCHITECTURE.md section 6 is unchanged). Revisit only if the Windows checklist above fails on media capture or WebRTC, or if WebKit's echo cancellation or codecs cause quality problems that Chromium does not have in the phase 1 translated-audio tests.
