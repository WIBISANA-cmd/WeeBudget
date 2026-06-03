# CI/CD WeeBudget

Project ini memakai GitHub Actions untuk validasi otomatis dan deployment berbasis webhook.

## Alur Workflow

File workflow: `.github/workflows/ci-cd.yml`

- Pull request: menjalankan test Laravel, lint/build React, dan build Docker.
- Push ke `main`: menjalankan validasi yang sama, lalu memanggil webhook deploy jika secret tersedia.
- Manual: bisa dijalankan dari tab **Actions** lewat `workflow_dispatch`.

## Secret GitHub

Tambahkan di **Repository Settings > Secrets and variables > Actions**:

```txt
DEPLOY_WEBHOOK_URL=https://url-webhook-deploy-kamu
DEPLOY_WEBHOOK_TOKEN=token-opsional-jika-webhook-butuh-bearer-token
```

`DEPLOY_WEBHOOK_TOKEN` boleh dikosongkan jika provider deploy tidak membutuhkan token bearer.

Untuk Easypanel, gunakan URL deploy webhook dari service/project yang sudah terhubung ke repository. Environment production tetap diset di Easypanel memakai `.env.docker.example` atau `.env.easypanel-one-service.example`.

## Yang Dicek

Backend:

```bash
cd weeb-api
composer install
composer validate --strict --no-check-publish
composer test
```

Frontend:

```bash
cd weeb-ui
npm ci
npm run lint
npm run build
```

Docker:

```bash
docker build .
docker compose build
```

## Catatan

- Deployment hanya berjalan untuk branch `main`.
- Jika `DEPLOY_WEBHOOK_URL` belum diisi, workflow tetap sukses setelah CI dan deployment dilewati.
- Workflow tidak menyimpan `.env` lokal ke repository. Semua secret production tetap berada di GitHub/Easypanel.
