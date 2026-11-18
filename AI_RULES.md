# AI_RULES.md — Chrome Extension Studio Standards

## 1. Workspace Architecture (Two-Layer Monorepo)
- **Root (`/`)**: Universal Live Preview Simulator (`index.html`, `package.json`, `AI_RULES.md`, `sample-ext/`). Do NOT modify root simulator files when working inside an extension subfolder.
- **Extension Subfolder (`/<extension-folder>/`)**: Self-contained Manifest V3 extension ready for Chrome `Load unpacked`. Use relative paths only inside this folder.

## 2. Tech Stack & Manifest V3 CSP
- **100% Vanilla Web**: Pure HTML, CSS, and JavaScript only. No frameworks, no build steps, no external CDNs.
- **Strict CSP Compliance**: Never put inline `<script>` tags or inline `on*` attributes (`onclick`, `onchange`) inside HTML. Bind all listeners in external `.js` files.

## 3. UI, Icons & Credit Standards
- **SVG Icons**: Use centralized SVG helpers (`icons.js` -> `renderIcon()`) with monochrome stroke style (`fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`). Never alter raster extension icons (`icon16.png`, `icon48.png`, `icon128.png`).
- **Theming**: Use CSS Custom Properties (variables) to support clean Light & Dark modes.
- **Mandatory Footer Credit**: Every extension's `popup.html` and `options.html` must include a low-key footer credit formatted strictly as:
  `© 2026 — Developed by FIKRI`

## 4. Versioning Convention (`MAJOR.MINOR.PATCH`)
- Follow `1.x.x` semantic versioning:
  - **MAJOR (`x.0.0`)**: Breaking architecture changes.
  - **MINOR (`1.x.0`)**: New features or UI redesigns.
  - **PATCH (`1.x.x`)**: Bug fixes or minor adjustments.
- Always update the version number consistently across `manifest.json`, `options.html` footer, and `README.txt`.

## 5. Data & Token Optimization
- Do NOT read, inspect, or regenerate large static preset files (`operator1.json`, `operator2.json`, `operator3.json`) unless specifically instructed to edit parameter entries.
- When editing an extension, only modify files directly impacted by the requested feature or bug fix.
