# stagemyscreen

A browser-based 3D device mockup editor built with **Next.js 16, React 19, Tailwind CSS 4, and Three.js**. It uses original procedural device models and demo UI screens.

Source: [kupchenko/stagemyscreen](https://github.com/kupchenko/stagemyscreen). Share feedback and bug reports through [GitHub issues](https://github.com/kupchenko/stagemyscreen/issues).

## Run locally

Requires Node.js 22.18+ (Node.js 24 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3111 for the homepage, or http://localhost:3111/studio for the editor. No API keys, environment variables, accounts, or backend are required.

```bash
npm run build
npm start
```

## Create a composition

The homepage is a single-screen introduction built around a render of the Device family layout. See [Homepage implementation and assets](docs/HOMEPAGE.md) for asset provenance and optional GitHub configuration.

1. Add an iPhone 17, iPad Pro 13-inch, iMac 24-inch, Studio Display 27-inch, Studio Display XDR 27-inch, or MacBook Pro 16-inch M4 (2025 lineup) from the library.
   Payment hardware includes Square Terminal, a generic PIN-pad Card Reader, and a generic Countertop POS. Each has an independently replaceable screen, transforms, and compatible scene lighting/export controls.
2. Select a device and choose **Replace screenshot**, or drop a PNG, JPG, or WebP directly onto it. Each device keeps its own screenshot. Uploaded images also appear in the reusable Uploads library.
3. Drag to move a device. Use the Rotate tool (or hold Alt/Option while dragging) to rotate it. The inspector provides exact XYZ positions, three rotation axes, scale, finish, and image fit controls.
4. Use layouts to create a device family, laptop-and-phone pair, floating phones, or a single-device hero. Layout changes are undoable and reuse screenshots for matching device types.
5. Open **Scene → Lighting** to choose from 12 lighting modes: Soft studio, Bright studio, Window light, Overcast, Golden hour, Cool daylight, Dramatic, Rim light, Top light, Warm softbox, Neon duo, and Sunset. Adjust brightness and light direction, then expand **Fine-tune lighting** for warmth and reflections, or **Shadow settings** for strength and softness. Screenshot colors remain unchanged. Set the canvas ratio and background below; use **Fit canvas** to fit visible devices.
6. Export a lossless PNG with transparent or solid background. **8K Ultra** is the default; widths range from 1920 to 15,360 pixels (16K), depending on the canvas ratio. Ultra renders at twice the width and height, then downsamples with alpha preserved. High renders at native resolution for faster output. The completed PNG has a preview, a full-resolution link, and a Download PNG button.

The editor supports up to 30 devices, 100 screenshots, and 50 undo steps. Uploads accept PNG/JPG/WebP up to 25 MB, 16,384 pixels per dimension, and 70 megapixels. Export resolution is independent of preview size; export retains screen textures and excludes all editor UI and checkerboards. Source screenshot resolution determines how sharp its content can be.

Exports render in tiles of at most 2048 × 2048 GPU pixels, with overlapping filtering margins to avoid seams. Contact shadows use a 4096-pixel map during export. Screenshot fit, rotation, and flips sample the original image directly on the GPU without intermediate canvas resizing. Output is capped at 16,384 pixels per edge and 128 megapixels; unavailable sizes are omitted for portrait and square canvases. The final PNG still needs browser memory for its full-size canvas. Low-resolution source screenshots and model textures cannot gain missing detail through a larger export.

## Projects and privacy

Project files use the `.stagemyscreen` extension and contain JSON.

Nothing is stored in the browser: a project only exists in the tab until you save it. Use the header **File** menu → **Save project** (⌘/Ctrl + S) to write the file, **Save as…** (⌘/Ctrl + ⇧ + S) to choose a new name or location, and **Open project** to restore a composition and its embedded screenshots. Chromium browsers save straight back to the chosen file; elsewhere the studio asks for a name and writes to the download folder. Leaving the page with unsaved edits asks for confirmation first. Imported project data is validated before rendering; remote image URLs and SVG uploads are rejected.

All image processing, 3D rendering, and PNG export happen on the client. The app does not upload designs to a server, collect analytics, or use external rendering services. Demo SVGs and fonts are served by the app; Google fonts are downloaded at build time by `next/font`.

## Keyboard shortcuts

| Action                            | Shortcut               |
| --------------------------------- | ---------------------- |
| Move tool                         | V                      |
| Rotate tool                       | R                      |
| Temporarily rotate while dragging | Alt / Option           |
| Undo                              | Ctrl / Cmd + Z         |
| Redo                              | Ctrl / Cmd + Shift + Z |
| Duplicate selected device         | Ctrl / Cmd + D         |
| Delete selected device            | Delete / Backspace     |
| Save project                      | Ctrl / Cmd + S         |
| Save as                           | Ctrl / Cmd + Shift + S |

## Implementation

- `src/components/studio/studio.tsx`: editor, undo history, screenshot import, project file saving, and export UI.
- `src/components/studio/canvas.tsx`: lazy-loaded WebGL canvas and pointer interaction.
- `src/lib/device-engine.ts`: screen textures, studio lighting, picking, fit-to-canvas, GPU resource cleanup, and high-resolution PNG rendering.
- `src/lib/scene-lighting.ts` and `src/lib/lighting-rig.ts`: 12 lighting presets, validated controls, reusable lights, and colored reflection environments. Lighting settings are included in undo, portable project files, and exports. Older projects retain the original Soft studio appearance.
- `src/lib/device-models.ts`: detailed, dimension-referenced iPhone 17, iPad Pro, iMac, Studio Display, Studio Display XDR, and MacBook Pro geometry and model-specific materials.
- `src/lib/contact-shadow.ts`: height-weighted transparent contact shadows and Gaussian blur.
- `src/lib/studio.ts`: project schema, validation, device catalog, and composition presets.
- `public/screens/`: original demo UI screenshots; regenerate with `node scripts/create-demo-screens.mjs`.

The hardware models are original dimension-referenced presentation models, not official Apple CAD assets. Their features, proportions, materials, and source references are documented in [Device models](docs/DEVICE-MODELS.md). There is no animation/video export, cloud account system, multi-project cloud storage, or photorealistic path tracer. A WebGL 2 capable browser with hardware acceleration is required. High-resolution exports depend on available GPU memory; use a smaller width on constrained devices. The editor is responsive, with collapsible side panels on small screens.

A backend is unnecessary for the current local workflow. If cloud storage, accounts, or server-side rendering are added, use **NestJS** as requested.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Unit tests cover project round-tripping, validation of untrusted imports, screenshot preservation across presets, independent device IDs, and export aspect ratios. The browser workflow is also manually checked for selection, transforms, screenshot upload, fitting, undo/redo, presets, project files, responsive layouts, and PNG export transparency.

## Import your own 3D models

Choose **Devices → Import 3D model**, then select a **GLB**, **glTF 2.0**, or **USDZ** from your disk. For glTF with separate assets, select its `.gltf`, `.bin`, and texture files together, or choose the model folder. A folder should contain one model; relative texture paths are preserved. Models are automatically centered and scaled to fit the studio, with their original materials and textures retained. Draco and Meshopt geometry compression are supported; Draco decoders are bundled locally under `public/decoders/draco/` (Apache 2.0).

Imported assets appear in **Your models**. Add multiple copies, each with independent position, rotation, scale, visibility, and screenshot. The editor automatically selects an unambiguous screen using display materials, screen names, and verified Apple iPad/iPhone screen mappings. This also applies to previously imported models when reopening a project. Replace the screenshot directly; **Screen → Advanced screen settings** contains the manual surface override, width/height ratio, rotation, and flips. Unrecognized or ambiguous models require a manual choice. The screen must have UV coordinates; a separate screen mesh using the full 0–1 UV square works best. **Original materials** restores the model’s own screen texture. Manual overrides are saved with each device. Scene lighting, transparent PNG exports, undo/redo, and project files all work with imported models.

Models and local dependencies stay in the browser and are embedded once per library asset in saved `.stagemyscreen` files. Reopening does not require the original files. Remove all scene instances before deleting a library asset; deletion is undoable.

Limits: 64 MB per import (up to 200 files), 30 library models, 96 MB of embedded model documents, 5 million vertices and 2,000 surfaces per model. Project imports are capped at 150 MB. Supported textures are PNG/JPEG/WebP; required KTX2 textures produce a conversion message. Remote assets are rejected. Models use their static pose; embedded cameras/lights are excluded so the studio controls the scene. Native Blender, FBX, and OBJ files must be exported as GLB/glTF first.

### USDZ imports

USDZ is converted locally into the same self-contained glTF representation used by the editor. No backend, upload, or external conversion service is involved. ASCII USDA and binary USDC root layers are supported, including Apple’s iPhone 17 AR asset. Geometry, UVs, and supported PBR materials/textures are retained; models support the existing screen mapping, multiple copies, scene controls, project saving, and transparent PNG export.

Use a flattened USDZ package with a single USD scene layer at the archive root. Multi-layer or nested-root packages produce a flatten/export-as-GLB message. The expanded archive shares the 64 MB / 200-file limit. PNG, JPEG, and browser-decodable AVIF textures must be embedded; textures are converted to glTF-compatible images with a maximum dimension of 8192 pixels. Conversion can increase project size, which is checked against the library limit.

USD shader graphs, variants, custom color spaces, and animation are not fully interchangeable with real-time glTF rendering. This importer uses the authored default static scene and Three.js-supported materials, assuming default linear Rec.709 color constants. Inspect an imported asset before relying on a final render. Screen replacement requires a suitable UV-mapped mesh; obfuscated mesh names and atlas UVs may need preparation in a 3D editor. Importing a model does not remove its existing camera/notch geometry.

USDZ screenshot orientation starts at 0° with a vertical flip to match the UV origin retained by conversion. New devices and newly selected surfaces receive these defaults. For an existing mirrored or upside-down screen, use **Screen → Advanced screen settings → Reset image orientation**; manual rotation and flip controls remain available for custom mappings. Existing orientation settings are retained when the selected screen remains the same.

## License

Copyright (C) 2026 Dmitrii Kupchenko

stagemyscreen is free software under the [GNU Affero General Public License v3.0](LICENSE). You can use, modify, and share it for free. If you distribute a modified version, or run one as a network service, you must make its complete source code available under the same license.

The bundled Draco decoder in `public/decoders/draco` keeps its own Apache-2.0 license.
