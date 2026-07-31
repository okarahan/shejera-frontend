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

## Image

GitHub Actions: Push auf `main` erzeugt automatisch den nächsten Patch-Tag (`v0.1.x`), der Tag-Build pusht nach `ghcr.io/okarahan/shejera-frontend`. Flux im Homelab aktualisiert das Deployment.

Docs-only: Commit-Message mit `[skip release]` verhindert den Auto-Tag.

## Produktion (Ingress)

Ein Host für UI + API, z. B.:

- Public: `http://shejera.o.karahan.de`
- Intern: `https://shejera.home.okarahan.arpa`

Routing (SPA):

- `/contrib/<token>`: Invite redeem → Cookie `shejera_session`
- `/contrib`: Contributor-Hub (İçe aktar-Dialog)
- `/contrib/tree/<id>`: Beitragsbaum (gleicher Editor wie Main)
- `/main/tree/<id>`: Hauptbaum (Authelia)
- `/` → Redirect auf `/main/tree/<id>`
- `/admin/*`: Einladungen
- `/api/*`: shejera-backend

**Authelia (Homelab / Traefik):** PathPrefix `/contrib` **ohne** Authelia (gesamte Contributor-Oberfläche inkl. Redeem). Hauptbaum und Admin weiter hinter Authelia.

Auth im Browser:

- Backend setzt Cookie `shejera_session` (HttpOnly) nach Invite-Redeem.
- Diese Cookie enthält ein stateless JWT; kein serverseitiges `app_session`-State benötigt.

