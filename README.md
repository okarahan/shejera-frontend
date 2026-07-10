# shejera-frontend

React-Frontend für Shejera (Familienbaum). Deployment via [homelab](https://github.com/okarahan/homelab) + Flux.

Backend: [shejera-backend](https://github.com/okarahan/shejera-backend)

## Voraussetzungen

Node.js 20+ (lokal). In CI wird Node 22 im Docker-Build verwendet.

## Lokal

```bash
npm install
npm run dev
```

Dev-Server: http://localhost:5173

API-Aufrufe unter `/api/*` werden per Vite-Proxy an `http://localhost:8080` weitergeleitet (kein CORS in der Entwicklung).

## Build

```bash
npm run build
npm run preview
```

## Image

GitHub Actions pusht nach `ghcr.io/okarahan/shejera-frontend` bei Push auf `main` oder Tags `v*`.

Nach erstem Push: Package auf **public** stellen unter GitHub → Packages.

## Release

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Produktion (Ingress)

Frontend und Backend unter **einer Domain** deployen, z. B.:

- `/` → shejera-frontend (nginx)
- `/api/` → shejera-backend

So entstehen keine Cross-Origin-Probleme.
