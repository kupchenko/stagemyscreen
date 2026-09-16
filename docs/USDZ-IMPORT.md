# USDZ import verification

Verified locally on 2026-09-16 at `http://127.0.0.1:3111/`.

- Imported [Apple’s iPhone 17 AR USDZ](https://www.apple.com/105/media/us/iphone-17/2025/b2c72de3-1cbc-4e24-b4d3-23c7abcec4ec/ar/iphone-17-e-sim.usdz) through the file chooser. This is a binary USDC archive, 3,264,194 bytes. The converted project contains 75 meshes, 75 materials, and 50 embedded images.
- Selected its display surface `eXcdWRctfHqyWLU` (`48:0`), uploaded the local payment UI fixture, and enabled **Flip image vertically** to match this asset’s UV orientation. Its screen aspect is approximately 0.459. Fill mode crops the wider payment-terminal screenshot as expected.
- Added a second copy using original materials, rotated it to show the rear, and confirmed the first copy’s screenshot stayed independent.
- Saved, reloaded the page, then opened the portable project after replacing the scene with an empty fixture. Both instances, the imported asset, screenshot binding, and transforms survived.
- Exported a 3840 × 2160 RGBA PNG. Verified 6,081,326 fully transparent pixels and 171,854 partially transparent pixels; visually inspected front and rear details and screenshot orientation.
- Restored the original Product showcase scene and left the import dialog ready.

Local review files are in `~/Downloads/usdz-screen-and-materials.stagemyscreen` and `~/Downloads/usdz-screen-and-materials-3840px.png`. The source USDZ is in `/tmp/usdz-qa/`; it is not bundled in the application’s device library.

Automated validation: typecheck, lint, all 27 tests, production build, and whitespace check passed. New tests cover ASCII USDZ conversion, UV and PBR retention, standalone project data, archive limits, corrupt/nested packages, and missing/remote textures. Temporary HMR errors while the new module was being created resolved before verification; no new runtime errors occurred during the completed workflow.

Compatibility: one flattened root-level USD layer per package; static scene and supported Three.js materials. Complex USD shader graphs and custom color spaces may require preparation. The importer compensates for Three r186’s extra gamma conversion of base/emissive constants, using OpenUSD’s [default linear Rec.709 color space](https://openusd.org/release/user_guides/color_user_guide.html). Uploaded models retain authored camera/notch meshes; screen replacement does not remove geometry.

## Screenshot orientation correction

Reproduced upright, horizontally mirrored text on the imported iPhone with 180° image rotation and no vertical flip. **Reset image orientation** now restores 0°, horizontal flip off, vertical flip on for USDZ. Visually confirmed readable text after reset and checked the same defaults on a new library instance. A geometry/UV regression test verifies that all four screenshot corners map correctly after USDZ conversion; the GLB fixture retains its existing correct orientation. Typecheck, lint, all 28 tests, and the production build pass.
