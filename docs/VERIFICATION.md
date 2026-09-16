# Verification

Historical verification log. Referenced screenshots and rendered PNGs are local QA artifacts and are excluded from Git; they may contain user-provided designs.

Verified locally on September 16, 2026, using the Codex in-app Chromium browser.

## Automated checks

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 14 tests passed, including geometry validity for all six models, project migration and validation, screen ratios, Studio Display identities, all 12 lighting rigs, independent lighting adjustments, and MacBook screen/hinge/keyboard geometry.
- `npm run build`: passed; the App Router page is statically prerendered and the 3D engine loads on the client.

## Browser checks

- Initial desktop composition displays independently textured monitor, tablet, and phone models.
- Direct canvas dragging changes the selected device's position. Rotate-tool dragging changes its angle. Undo restores the original transforms.
- Exact angle input, duplication, and undo update the scene correctly.
- Position X/Y/Z sliders and numeric fields stay synchronized at 0.01 precision. Keyboard adjustment, pointer input, reset, and undo were checked; the original transforms were restored afterwards.
- Hiding a device reduces the visible device count and showing it restores the count.
- PNG screenshot upload updates the selected phone; the desktop retains its original screenshot.
- Cover and contain modes are selectable per device.
- Laptop-and-phone preset renders keyboard, trackpad, frame, and independent screens. Layouts preserve matching screenshots.
- Project download contains all device transforms and embedded screenshot data.
- Reload restores uploaded screenshots, image fitting, and rotation from IndexedDB.
- Importing the downloaded project file succeeds and restores its content.
- At 390 × 844, the device/scene panels open from mobile controls and there is no horizontal document overflow. The square canvas measures 364 × 364; portrait canvas preserves 9:16.
- Model-specific finish switching was checked on the iMac; the screenshot remains assigned after the mesh rebuild.
- iPhone 17 was rotated to 150° using the inspector, its corrected rear camera placement was inspected, and undo restored its front-facing composition.
- Studio Display and Studio Display XDR were inspected from front and rear angles, including their different stands, cable openings, rear ports, and aluminum edges.
- Both displays can be added using the device library and the six-model Add device dialog. Library thumbnails are rendered from the actual models.
- A composition containing both displays with different screenshots exported successfully at 4K with transparency.
- All 12 lighting modes were selected in the browser and exported at 1920 × 1080. The decoded images have 12 distinct pixel hashes; every nondefault mode changes over 186,000 hardware pixels relative to Soft studio. All modes retain identical alpha channels, and an interior screenshot region remains pixel-identical across all 12 exports.
- Lighting undo and redo, reset, custom numeric controls, autosave/reload, and portable project import/export were checked. A project without lighting data restores the original Soft studio setup.
- Custom shadow strength and softness change the exported alpha mask (181,073 pixels differed in the tested composition).
- Rebuilt MacBook Pro was inspected from front, rear, elevated keyboard, and side angles in Silver and Space Black. A native-ratio demo screen avoids the previous cropped preview; its library thumbnail comes from the new geometry. The laptop-and-phone composition was checked with the new proportions.
- The first layout, The device family, matches the supplied reference placement: Studio Display behind, smaller iPhone at lower left, and landscape iPad at lower right. Verified undo/redo, autosave/reload, and all three screenshot assignments plus fitting modes in the downloaded project. Existing iMac screenshots transfer to the display. The scene uses 16:9 framing.
- Final browser console has no warnings or errors.

## Export file inspection

Decoded actual downloaded PNGs with Sharp and inspected their pixel alpha channels:

| Export                                   | Actual dimensions | Alpha verification                                                                         |
| ---------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| 4K transparent                           | 3840 × 2160       | 3,717,698 fully transparent pixels; 537,228 partial-alpha pixels; corner RGBA = 0,0,0,0    |
| 8K transparent                           | 7680 × 4320       | 14,877,332 fully transparent pixels; 2,134,738 partial-alpha pixels; corner RGBA = 0,0,0,0 |
| Full HD opaque (original workflow check) | 1920 × 1080       | All 2,073,600 pixels opaque; corner RGBA = 255,255,255,255                                 |
| Studio Display pair, 4K transparent      | 3840 × 2160       | 5,381,858 fully transparent pixels; 307,409 partial-alpha pixels; corner RGBA = 0,0,0,0    |
| Neon duo lighting, 4K transparent        | 3840 × 2160       | 3,717,698 fully transparent pixels; 537,228 partial-alpha pixels; corner RGBA = 0,0,0,0    |
| Rebuilt MacBook Pro, 4K transparent      | 3840 × 2160       | 5,226,724 fully transparent pixels; 472,447 partial-alpha pixels; corner RGBA = 0,0,0,0    |
| First saved layout, 4K transparent       | 3840 × 2160       | 4,224,991 fully transparent pixels; 428,971 partial-alpha pixels; corner RGBA = 0,0,0,0    |

The latest 4K and 8K exports use the rebuilt iPhone 17, iPad Pro and iMac models, high-resolution vector demo screens, AgX hardware tone mapping and soft contact shadows. Front and rear angles of all three requested devices were inspected in the browser; 4K review images were exported for each. The iMac stand's original uneven surface shading was corrected and the iPhone rear camera placement was corrected before the final family exports.

A verified transparent sample is saved at `docs/device-family-4k.png`; `docs/device-family-preview.png` is a smaller preview composited on a light background. The device library now shows thumbnails exported from the actual models. No browser console errors or warnings were present after the final 8K export.

The Studio Display sample is saved at `docs/studio-displays-4k.png`, with a smaller light-background preview at `docs/studio-displays-preview.png`. Both models support the existing screenshot-fitting, device-transform, project-persistence, and export workflows. The XDR stand is modeled in its lower position; its joints are not separately adjustable.

`docs/lighting-modes-preview.png` compares actual exports of all 12 lighting modes. `docs/lighting-neon-4k.png` is a transparent 4K sample. The original Product showcase composition was restored after these checks, with the Scene lighting panel open for use.

`docs/macbook-pro-4k.png` contains the rebuilt MacBook Pro, with a smaller light-background preview in `docs/macbook-pro-preview.png`. The final library thumbnail uses a new asset URL so previously cached laptop previews are replaced. Existing projects retain their screenshot assignments and transforms while generic Laptop Pro labels migrate to MacBook Pro.

Source-image resolution limits screenshot detail even when exporting at 8K. Extremely large portrait exports can exceed a device's GPU limits; the renderer checks dimensions and reports an error with a smaller-size suggestion.

Preview uses port **3111** to avoid conflict with another local project on port 3000. After checking the new displays, the user's saved Product showcase scene (Space Gray iMac, iPad Pro, and iPhone 17) was restored from its project backup.

The first-layout update is applied in the preview, with its transparent export saved at `docs/first-layout-4k.png`. The previous scene remains backed up in `~/Downloads/product-showcase.stagemyscreen`. All 16 tests, TypeScript checking, and ESLint passed after this layout change.

The MacBook is now explicitly the 16-inch M4 Pro / M4 Max from the 2025 lineup (Apple's late-2024 model). Its dated specifications are pinned in `src/lib/device-specs.ts`; the library and inspector identify the size and generation. Corrected the inverted-T arrow keys, widened the camera housing, and centered the camera. Silver and Space Black were checked in the browser. `docs/macbook-pro-16-m4-4k.png` is the verified 3840 × 2160 transparent export (5,226,724 clear and 472,447 partial-alpha pixels). The new library thumbnail is rendered from the updated model. All 17 tests, TypeScript checking, and ESLint passed. The saved device-family scene was restored after review.

The payment collection adds Square Terminal, a generic PIN-pad Card Reader, and a generic Countertop POS (nine library models total). Checked all three library add actions and rendered their thumbnails from the live engine. A Square screenshot uploaded as PNG retained its containment setting and 28° rotation after save/reload; the other two screenshots remained independent in the exported project. Geometry tests cover all nine screen ratios, finite normals, physical payment controls, and raycast clearance over Square's sloped screen. The final family export is `docs/payment-terminals-4k.png`: 3840 × 2160, 3,821,690 fully clear pixels, 846,318 partially transparent pixels, corner RGBA 0,0,0,0. All 20 tests, TypeScript, ESLint, and the production build passed. The prior device-family scene was backed up in `~/Downloads/product-showcase.stagemyscreen` and restored after payment-model verification.
