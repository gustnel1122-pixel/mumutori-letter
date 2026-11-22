# test3d v8d asset sources (2330 battle / quality)

| Asset | Source / license |
| --- | --- |
| Seven character GLBs | Existing Mumutori canonical files in `models/`; preserved byte for byte. No new character artwork. |
| Pea pod toy, acorn shell launcher, seeds, paper pieces | Original procedural geometry in `v8-office.js` and `v8-effects.js`; no external model assets. |
| Desk, swivel chair, monitor, keyboard, mouse, books, plants, opaque-backed bookcase, boxes, drawer cabinet, lamp (13 GLBs) | [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit), Kenney, **CC0 1.0**. Selected original GLBs in `assets/kenney/`; original `License.txt` included. Canonical character GLBs are separate and unchanged. |
| Mug GLB and its palette PNG | [Kenney Food Kit](https://kenney.nl/assets/food-kit), Kenney, **CC0 1.0**. `mug.glb`, `Textures/colormap.png`, original `Food-License.txt`. |
| Whiteboard, older peripheral shelves, bins, paper sheets, toy carts | Existing/original procedural geometry; retained around the imported furniture. |
| Wood grain, window stains/cracks/stuck seeds, expression symbols | Original Canvas drawing code; no external image assets. |
| HDR environment | [Studio Small 09](https://polyhaven.com/a/studio_small_09), Sergej Majboroda / Poly Haven, **CC0** ([license](https://polyhaven.com/license)). Original 1K RGBE, `assets/studio_small_09_1k.hdr`, 1,615,248 bytes. Loaded locally and converted once to PMREM; the earlier authored 128×64 environment remains a loading/error fallback. |
| three.js 0.160.1 / GLTFLoader / RGBELoader / PMREM / postprocessing | Three.js, MIT: https://github.com/mrdoob/three.js/blob/r160/LICENSE . Version remains pinned to the existing 0.160.1 import map. RenderPass → SSAO (high) → mild UnrealBloom → OutputPass (ACES/sRGB) → FXAA, with a 4× MSAA render target on WebGL2. |
| MediaPipe Tasks Vision 1.2.3 | Existing dependency, Apache-2.0: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE |

Character emotions deform cloned eye geometry with shader uniforms and animate existing body/arm/prop nodes. The seven original GLB files, canonical mouths, three pea bodies and sunflower-only stripes are not edited. Sunflower remains `canThrow: false`, receives no gun, fires no projectile, and carries an ammunition box instead. The launchers remain separate wheeled props, fetched/pushed by chickpea and rice.

All assets are self-hosted under `jg/test3d/assets/`; no runtime requests to asset providers, paid assets or external character models. `assets/manifest.json` records shipped asset hashes and original sources. Paper markings, playful seed impacts and six expression symbols remain authored Canvas drawings.

No purchased assets, generated video, third-party character designs or customer camera recordings are used. Diagnostic recordings are captures of the actual WebGL page with its camera disabled.
