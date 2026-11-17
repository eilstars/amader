// Copies the on-device hand detector (MediaPipe, WebAssembly) next to the web app.
// Runs after `npm install`. The web build then works with no network calls to anyone else.
const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const to = path.join(__dirname, '..', 'public', 'mediapipe', 'wasm');
try {
  fs.mkdirSync(to, { recursive: true });
  for (const name of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']) {
    fs.copyFileSync(path.join(from, name), path.join(to, name));
  }
} catch (e) {
  console.warn('Hand detector files were not copied. Measuring by hand will fall back to tapping.', e.message);
}
