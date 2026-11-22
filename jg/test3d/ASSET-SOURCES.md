# test3d v8 asset sources

| Asset | Source / license |
| --- | --- |
| Seven character GLBs | Existing Mumutori canonical files in `models/`; preserved byte for byte. No new character artwork. |
| Pea pod toy, acorn shell launcher, seeds, paper pieces | Original procedural geometry in `v8-office.js` and `v8-effects.js`; no external model assets. |
| Bookshelves, whiteboard, file cabinet, plants, bins, books | Original procedural geometry in `v8-office.js`; no external model assets. |
| Wood grain, window stains/cracks/stuck seeds, expression symbols | Original Canvas drawing code; no external image assets. |
| HDR environment | Original 128×64 floating-point radiance data generated in `v8-office.js`, processed once by PMREM. No downloaded HDR. |
| three.js r160 / GLTFLoader / PMREM | Three.js, MIT: https://github.com/mrdoob/three.js/blob/r160/LICENSE |
| MediaPipe Tasks Vision 1.2.3 | Existing dependency, Apache-2.0: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE |

Character emotions deform cloned eye geometry with shader uniforms and animate existing body/arm/prop nodes. The GLB files, canonical mouths, three pea bodies and sunflower-only stripes are not edited. Sunflower remains `canThrow: false` and receives no weapon.

No purchased assets, generated video, third-party character designs or customer camera recordings are used. Diagnostic recordings are captures of the actual WebGL page with its camera disabled.
