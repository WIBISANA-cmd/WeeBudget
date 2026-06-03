# Deploy WeeBudget di Easypanel dengan Docker

Setup ini menjalankan:

- `api`: Laravel API di port `8000`
- `ui`: React/Vite static app via Nginx di port `80`
- `db`: MySQL 8.4 dengan volume persistent

## 1. Siapkan Environment

Generate `APP_KEY` lokal:

```bash
cd weeb-api
php artisan key:generate --show
```

Gunakan isi `.env.docker.example` sebagai environment di Easypanel.

Minimal variable:

```bash
APP_KEY=base64:hasil-key-kamu
APP_URL=https://api.domain-kamu.com
FRONTEND_URL=https://app.domain-kamu.com
VITE_API_BASE_URL=https://api.domain-kamu.com/api

DB_DATABASE=weeb
DB_USERNAME=weeb
DB_PASSWORD=password-kuat
DB_ROOT_PASSWORD=root-password-kuat

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://api.domain-kamu.com/api/auth/google/callback
SANCTUM_STATEFUL_DOMAINS=app.domain-kamu.com
```

## 2. Deploy di Easypanel

1. Push project ke Git.
2. Buat project baru di Easypanel.
3. Pilih deploy dari repository.
4. Pilih mode Docker Compose.
5. Gunakan file `docker-compose.yml` di root repo.
6. Tambahkan environment variables dari `.env.docker.example`.
7. Deploy.

## 3. Domain

Tambahkan domain/subdomain:

- UI: arahkan ke service `ui`, port `80`
- API: arahkan ke service `api`, port `8000`

Contoh:

- `https://app.domain-kamu.com` -> `ui:80`
- `https://api.domain-kamu.com` -> `api:8000`

## 4. Google Auth

Di Google Cloud Console, tambahkan Authorized redirect URI:

```bash
https://api.domain-kamu.com/api/auth/google/callback
```

Pastikan env backend sama:

```bash
GOOGLE_REDIRECT_URI=https://api.domain-kamu.com/api/auth/google/callback
FRONTEND_URL=https://app.domain-kamu.com
```

## 5. Local Docker Check

```bash
cp .env.docker.example .env
docker compose build
docker compose up
```

Lalu buka:

- UI: `http://localhost:8080`
- API: `http://localhost:8000/api/dashboard`

## Catatan

- Build Vite membaca `VITE_API_BASE_URL` saat image dibuat. Kalau API domain berubah, rebuild service `ui`.
- Laravel migration berjalan otomatis saat container API start.
- Data MySQL disimpan di volume `weeb_mysql_data`.
