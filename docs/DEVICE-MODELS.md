# Device model construction

The editor uses original Three.js presentation models. They are dimension-referenced reconstructions, not official Apple CAD assets or scanned products. They remain fully rotatable; uploaded screenshots are mapped onto dedicated screen surfaces.

## Included hardware

- **iPhone 17, 6.3-inch**: 71.5:149.6:7.95 body proportions, 1206:2622 screen, rounded aluminum rail, polished perimeter, glass front and back, two vertically stacked rear cameras with layered lens elements, flash, microphone, side buttons, Camera Control, antenna bands, USB-C and speaker openings. The screen has no modeled notch, Dynamic Island, or front camera overlay: these come from the uploaded screenshot, avoiding duplicate cutouts. Finishes: White, Black, Mist Blue, Sage, Lavender.
- **iPad Pro, 13-inch**: 281.6:215.5:5.1 landscape body proportions, 2752:2064 screen, thin aluminum enclosure, glass bezel, landscape camera, rear camera and LiDAR representation, flash, four speaker grilles, USB-C, volume/power buttons, magnetic connector and Smart Connector. Finishes: Silver and Space Black.
- **iMac, 24-inch**: 547 mm enclosure width and 11.5 mm depth proportions, 4480:2520 screen, glass front bezel, aluminum chin, camera, rear panel and I/O, tapered stand with a geometric cable aperture and curved heel, and rounded base with rubber underside. Finishes: Silver, Blue, Green, and a custom Space Gray option with a dark glass bezel and matching aluminum body, chin, and stand.
- **Studio Display, 27-inch**: 623:362:31 enclosure proportions, centered 5120:2880 screen with a black glass bezel, beveled aluminum housing, camera, dense top and bottom edge grilles, four recessed rear ports, a broad tilt stand with a real circular cable opening, rounded base, and rubber feet. Finish: Silver.
- **Studio Display XDR, 27-inch**: 623:362:33 enclosure proportions, centered 5120:2880 screen and black bezel, rear I/O and edge grilles, plus a separate height-adjustable-style stand modeled in its lower position: upright aluminum sheet, elongated cable opening, counterbalance arm, circular pivot hardware, and a deeper base. Finish: Silver. Whole-device transforms are editable; stand articulation is fixed in this version.
- **MacBook Pro 16-inch, M4 Pro / M4 Max (2025 lineup)**: Apple's late-2024 model sold throughout 2025, pinned to its dated specifications. 355.7:248.1:16.8 closed-body reference dimensions and a 3456:2234 screen at 254 ppi. Rounded aluminum lower case, a machined upper deck with keyboard and trackpad recesses, a curved front finger scoop, 78 staggered ANSI keycaps with a high-resolution legend atlas and half-height inverted-T arrows, Touch ID, 2,988 instanced speaker perforations, a broad Force Touch trackpad, a continuous hinge, and a separate lid at a 108° opening angle. Includes the centered 12MP Center Stage camera in its widened notch, polished perimeter, rear logo, MagSafe 3, three Thunderbolt 5 USB-C ports (two left, one right), headphone jack, SDXC and HDMI representations, bottom seams, rubber feet, and screws. Finishes: Silver and Space Black. The lid angle is fixed; whole-device rotations remain editable. Legacy Laptop Pro and MacBook Pro labels migrate to MacBook Pro 16″ without changing custom names, screenshots, or transforms.

## Payment hardware

- **Square Terminal**: reconstructed from Square's 86.4 × 142.2 × 63.5 mm dimensions and product views. Rounded white wedge enclosure, sloped 5.5-inch portrait screen, thermal receipt outlet and tear bar, front chip-card slot, right-side magnetic-stripe channel, side power button and USB-C port, bottom service plate, mounting socket, and nonslip feet. White finish. The 720 × 1280 demo is a 9:16 upload guide. This is an original presentation mesh, not Square's official CAD asset.
- **Card Reader**: original generic portable PIN-pad design, with a 4:3 screen (640 × 480 upload guide), 15 raised keys including colored cancel/clear/confirm keys, tactile marker on 5, contactless mark, chip slot, USB-C, rear battery cover, screws, and protective rails. White and Graphite finishes. It is not branded as a Global Payments model.
- **Countertop POS**: original generic landscape terminal with a 16:10 screen (1280 × 800 upload guide), tilted screen assembly, pivot, broad pedestal, weighted nonslip base, front card slot, contactless mark, rear I/O, and instanced ventilation. White and Graphite finishes.

All three accept independent uploaded screenshots with cover, contain, or stretch fitting and use the shared transform, lighting, project save/import, and transparent PNG export paths. Library thumbnails come from actual renders of the meshes.

## Rendering

Round surfaces use 32–48 curve segments and eight bevel segments; welded surface normals prevent faceting at metallic edges. Materials distinguish anodized aluminum, polished trim, glass, plastic gaskets, lens coatings and contacts. Studio environment reflections, three directional lights, and AgX tone mapping light the hardware. Screens bypass tone mapping to preserve screenshot colors.

A separate height-weighted contact-shadow pass renders from beneath the devices and applies three two-axis Gaussian blur passes. Shadows retain transparency without putting a solid floor in the export. Export resolution is independent of the preview; 4K and 8K PNGs use the same mesh detail. High-resolution source images remain necessary for sharp UI text.

The Scene panel provides 12 lighting modes with separate key, fill, rim, ambient, and reflection settings. Brightness controls hardware illumination; direction rotates the lights and reflection environment together. Warmth tints both direct lighting and the generated reflection studio. Reflection strength is independently adjustable. Screens stay unlit and bypass tone mapping. Contact-shadow opacity and blur radius are adjustable; these remain ground contact shadows, not directional cast shadows. Generated reflection environments use a bounded three-entry GPU cache and are disposed when evicted or when the editor unmounts. Older projects migrate to the original Soft studio appearance.

The library thumbnails are exports of these same meshes, not stock photographs or stand-in illustrations.

## References and attribution

Public physical specifications were consulted to establish proportions and model-specific features:

- [Apple iPhone 17 specifications](https://www.apple.com/ie/iphone-17/specs/)
- [Apple iPad Pro specifications](https://www.apple.com/ipad-pro/specs/)
- [Apple iMac 24-inch M4 specifications](https://support.apple.com/en-gb/121557)
- [Apple MacBook Pro 16-inch M4 specifications and port views (2024 model, 2025 lineup)](https://support.apple.com/en-us/121554)
- [Apple Studio Display specifications and stand views](https://www.apple.com/studio-display/specs/)
- [Apple Studio Display XDR specifications and stand views](https://www.apple.com/studio-display-xdr/specs/)
- [Square Terminal specifications](https://squareup.com/us/en/hardware/terminal/specs) and [product views](https://squareup.com/us/en/hardware/terminal)

The small Apple silhouette is from [Simple Icons](https://github.com/simple-icons/simple-icons), whose icon artwork is CC0. Apple and Square product names and marks belong to their respective owners. This independent editor is not affiliated with Apple or Square. No third-party device meshes, manufacturer CAD files, stock photographs, or paid model assets are bundled.
