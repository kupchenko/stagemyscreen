# Public homepage

The homepage is at `/`; the existing editor is at `/studio`. All creation links open the existing editor component; its save/open behavior is unchanged.

## Implementation

- `src/components/home/homepage.tsx`: a single server-rendered page — header, hero with calls to action, the Device family render, three short points (free, local, open source), and a footer.
- `src/components/home/home.module.css`: scoped, responsive styling. Existing editor CSS is unchanged.
- `src/app/studio/page.tsx`: the editor route and its metadata.

The homepage does not initialize Three.js, access saved projects, or import device assets into a user's library. The hero image uses Next Image with quality 90 and is preloaded.

## Repository and contribution status

The repository is [kupchenko/stagemyscreen](https://github.com/kupchenko/stagemyscreen). Unauthenticated GitHub API access confirmed that it is public and has issues enabled on September 16, 2026. The homepage uses this repository by default for GitHub, View source, and Contribute on GitHub links.

Set `NEXT_PUBLIC_GITHUB_URL` to override the repository when deploying a fork; set it to an empty string to hide repository links. Only a `https://github.com/owner/repository` URL is accepted. The project is licensed under AGPL-3.0 (`LICENSE`), which backs the homepage's "open source" wording. `public/decoders/draco/LICENSE.txt` applies to that dependency. No `CONTRIBUTING` document has been added.

## Preview provenance

`public/home/hero-family.webp` is an actual export from this application's renderer: the studio's **Device family** layout (`applyPreset(DEFAULT_PROJECT, "showcase")`) with its original procedural display, phone, and tablet models and the original Morrow demo interfaces in `public/screens`. It does not contain Apple's downloaded USDZ models, user-uploaded screenshots, or external stock imagery.

`scripts/homepage-preview-renderer.tsx` records the exact scene and export settings (zoom 0.86 so the contact shadow is not clipped, 8K Ultra, transparent). To regenerate during local development, temporarily copy it to `src/app/preview-assets/page.tsx`, open `/preview-assets`, and use Render homepage previews. It operates in isolation from editor storage. Save the PNG, resize it from 7680px to 3840px, then encode WebP at quality 94 and alpha quality 100. Remove the temporary route before building or publishing.

## Feature claims checked against implementation

- 8K Ultra default, selectable widths up to 15,360px, output dimension/area limits: `export-quality.ts` and the studio export dialog.
- 12 light presets with brightness, direction, warmth, reflection and shadow controls: `scene-lighting.ts` and lighting controls.
- Multiple independent device transforms and screenshots, layouts, transparent PNGs: project schema, studio controls and renderer.
- Local GLB/glTF/USDZ import, supported material preservation and screen replacement: model importer and custom model renderer.
- No payment/account/watermark; client-side processing and local autosave: existing editor implementation. Model usage rights remain separate from these capabilities.

## Verification — September 25, 2026

- TypeScript, ESLint, the test suite, Prettier, and the production build pass; the route table contains `/` and `/studio` and no temporary preview route.
- Inspected at 1440px, 1280px, and 375px widths with no horizontal document overflow. The render's floor shadow fades out without clipping.
- Start creating and Open studio go to `/studio`; GitHub links point to the public repository.
