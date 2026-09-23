# Portfolio · Joaquín Guerrero

Vite + React + TypeScript. Three.js (escena 3D, carga diferida), i18n ES/EN en vivo, tema claro/oscuro, WCAG 2.2 AA.

```bash
npm install
npm run dev      # desarrollo
npm run build    # genera dist/
```

## Editar contenido
- Textos ES/EN: `src/i18n/es.ts` y `src/i18n/en.ts`
- Proyectos, experiencia, stack, contacto: `src/components/Sections.tsx`
- Colores: `src/styles/global.css` (y `PALETTE` en `src/scene/scene.ts` para la escena 3D)

## Archivos que faltan (poner en `public/`)
- `cv.pdf` — lo usa el botón "Descargar CV"
- `og.png` (1200×630) — luego agregar `<meta property="og:image" content="https://joaquinguerrero25.github.io/og.png">` en `index.html`

## Deploy (GitHub Pages)
1. Crear el repo `JoaquinGuerrero25.github.io` y subir este proyecto a la rama `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Cada push a `main` publica con `.github/workflows/deploy.yml`.

Si el repo tuviera otro nombre, cambiar `base` en `vite.config.ts` a `'/nombre-repo/'`.
