# WeeBudget UI

Frontend React + Vite untuk WeeBudget.

## Deploy ke Netlify

Project ini sudah punya `netlify.toml` di root repository, jadi Netlify bisa membaca konfigurasi deploy walaupun frontend berada di folder `weeb-ui`.

Build settings:

- Base directory: `weeb-ui`
- Build command: `npm run build`
- Publish directory: `weeb-ui/dist`
- Node version: `22`

Environment variable wajib di Netlify:

```bash
VITE_API_BASE_URL=https://domain-backend-kamu.com/api
```

Catatan:

- Netlify hanya deploy frontend statis. Backend Laravel `weeb-api` perlu di-host terpisah, misalnya Railway, Render, VPS, Laravel Cloud, atau layanan PHP lain.
- Setelah domain Netlify jadi, update backend `.env`:

```bash
APP_URL=https://domain-backend-kamu.com
FRONTEND_URL=https://domain-netlify-kamu.netlify.app
GOOGLE_REDIRECT_URI=https://domain-backend-kamu.com/api/auth/google/callback
SANCTUM_STATEFUL_DOMAINS=domain-netlify-kamu.netlify.app
```

- Di Google Cloud Console, tambahkan Authorized redirect URI:

```bash
https://domain-backend-kamu.com/api/auth/google/callback
```

## Local build check

```bash
npm ci
npm run lint
npm run build
```

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
