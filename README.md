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

GitHub Actions pusht nach `ghcr.io/okarahan/shejera-frontend` bei Push auf `main` oder Tags `v*`.

## Produktion (Ingress)

Ein Host für UI + API, z. B.:

- Public: `http://shejera.o.karahan.de`
- Intern: `https://shejera.home.okarahan.arpa`

Routing (SPA):

- `/import/<token>`: Invite-Preview + Redeem (führt zu einem Import-JWT-Cookie)
- `/import`: Import-Hub (Button → Dialog → Preview)
- `/view`: Stub / später (aktuell Import-Fokus)
- `/api/*`: shejera-backend

Auth im Browser:

- Backend setzt Cookie `shejera_session` (HttpOnly) nach Invite-Redeem.
- Diese Cookie enthält ein stateless JWT; kein serverseitiges `app_session`-State benötigt.

