# Local model import

Implemented September 16, 2026. Import GLB/glTF through Devices → Import 3D model. Original model geometry, materials, and textures are retained. Choose a UV-mapped surface under Screen to assign a per-instance screenshot. Imported models support the existing transform sliders, lighting, visibility, duplicate, undo, and transparent export workflow.

Model files are resolved locally, embedded into a self-contained glTF document, and saved once per library asset. Devices reference the asset by ID. No model upload service or backend is used. Companion resources can be selected together or as a folder, preserving subfolder paths; ambiguous basename matches and missing resources are reported before the model enters the scene. Files with remote resources are rejected.

## Verification

- TypeScript, ESLint, production build, and 24 tests pass.
- Browser import: GLB with data-URI images; GLB with images in binary buffer views; glTF with a separate BIN and PNG; glTF folder containing nested `data/` and `textures/` directories.
- Missing glTF resource: importer identifies `data/display.bin` and leaves the scene unchanged.
- Replaced one imported screen with a portrait screenshot using Fit inside; the other retained its original embedded texture. Rotation and scale were independent.
- Original materials restores the selected screen; undo restores the assigned screenshot.
- Saved two imported assets to a project file, opened an empty scene, and reopened the saved file. Geometry, textures, per-instance screenshot, fit, and transforms were retained.
- Exported at 3840 × 2160 with transparency: 6,272,870 fully transparent pixels, 216,662 partially transparent pixels, and zero corner alpha. See [verified export](custom-model-import-4k.png).
- Reloaded the browser after autosave; both imported assets and the screenshot assignment were restored.
- No browser warnings or errors during these flows.

The verification meshes and embedded artwork are original test fixtures, not production library devices. Supported constraints and formats are described in the main README.
