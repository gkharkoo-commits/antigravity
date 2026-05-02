# Camera + Screen Recorder Web App

We will build a high-end, desktop-level recording application using pure HTML, CSS, and Vanilla JavaScript (with minimal CDNs for background segmentation). The app will operate seamlessly entirely in the browser and will be installable as a Progressive Web App (PWA).

## User Review Required

> [!WARNING]
> **Background Replacement**: Implementing true real-time background replacement (blur/custom image) in Vanilla JS requires a segmentation model. I plan to use Google's **MediaPipe Selfie Segmentation** via a CDN script tag. Is this acceptable, or do you require a strict zero-dependency approach (which would limit background replacement to simple, unreliable Chroma Key / Green Screen)?

> [!IMPORTANT]
> **Recording Format**: Browsers natively support recording in `webm` via the `MediaRecorder` API. Real-time conversion to `mp4` in the browser requires heavy WebAssembly libraries (like FFmpeg.wasm) which can cause significant performance overhead. The plan is to output high-quality `webm` natively. If `mp4` is strictly required, let me know, but `webm` is highly recommended for performance.

## Open Questions

1. **Resolution Constraints**: Do you have a strict maximum resolution for the recording canvas? Merging 1080p screen + camera stream in real-time onto a single Canvas at 60fps can be resource-intensive on lower-end machines. I will include a resolution selector (480p, 720p, 1080p) as requested.
2. **Icons**: I will use SVG icons for the controls (or a lightweight library like Phosphor/FontAwesome via CDN). Do you have a preference?

## Proposed Changes

### Configuration & App Shell
#### [NEW] index.html
The main application shell. It will include:
- The `video` elements for screen and camera previews.
- The hidden `canvas` element for merging streams.
- The floating UI controls container.
- CDN links for fonts (Google Fonts: Inter/Outfit) and MediaPipe (if approved).

#### [NEW] manifest.json
The PWA manifest file, configuring the app name, icons, colors, and standalone display mode.

#### [NEW] sw.js
The Service Worker for offline capabilities. It will cache the app shell (`index.html`, `style.css`, `app.js`) to allow offline usage after the first load.

---

### Styling (Dark + Neon + Glassmorphism)
#### [NEW] style.css
The stylesheet will feature:
- A dark mode foundation with deep gradients.
- Neon glow effects on active elements (e.g., recording indicators, active buttons).
- Glassmorphism for the floating toolbar and setting panels (translucent backgrounds with backdrop-filter blur).
- Responsive absolute positioning for the draggable camera PiP overlay.

---

### Application Logic (Vanilla JS)
#### [NEW] js/app.js
The main initialization file. It will handle:
- Bootstrapping the app and registering the Service Worker.
- DOM element bindings.
- Event listeners for UI controls (Start, Stop, Settings, Draggable PiP).

#### [NEW] js/media.js
Handles all Media API interactions:
- `navigator.mediaDevices.getUserMedia` for the camera and microphone.
- `navigator.mediaDevices.getDisplayMedia` for screen capture.
- Applying video constraints (Resolution: 480p/720p/1080p, FPS).
- Applying audio constraints (Echo cancellation, Noise suppression).

#### [NEW] js/recorder.js
Handles the Canvas merging and MediaRecorder API:
- Continuously drawing the screen stream to a `canvas`.
- Drawing the camera stream (with optional segmentation mask applied) on top of the screen stream inside the `canvas`.
- Initializing `MediaRecorder` with the combined Canvas stream (`canvas.captureStream()`).
- Handling data chunks, stopping the recording, creating the `webm` Blob, and triggering the download.

#### [NEW] js/effects.js
Handles camera visual modifications:
- Real-time CSS filters (grayscale, sepia, brightness, blur) applied to the preview.
- Border-radius toggling for Circle vs Square camera shapes.
- Integration with MediaPipe for Background Blur, Solid Color, or Custom Image replacement.

#### [NEW] js/ui.js
Handles complex UI interactions:
- The drag-and-drop logic for the floating camera bubble.
- The recording timer (HH:MM:SS) logic.
- Fullscreen toggles and settings panel visibility.

## Verification Plan

### Automated Tests
- No formal automated testing framework will be used due to the Vanilla JS constraints, but all components will be rigorously tested manually in the browser.

### Manual Verification
- Start the development server and open the app in a Chromium browser.
- Verify the PWA installation prompt appears.
- Test capturing the screen and camera simultaneously.
- Move the camera PiP around the screen.
- Apply different backgrounds and filters.
- Record a 10-second clip and verify the downloaded `webm` file contains both streams merged correctly, along with audio.
- Test offline mode by disabling the network in DevTools.
