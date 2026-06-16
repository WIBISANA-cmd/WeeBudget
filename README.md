# 👛 WeeB (WeeBudget)

[![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**WeeB (WeeBudget)** adalah aplikasi manajemen keuangan cerdas yang dirancang khusus untuk membantu pengelolaan anggaran dengan pendekatan yang realistis, terutama bagi pengguna dengan penghasilan tetap atau gaji UMR. 

Aplikasi ini berfokus pada simulasi "Uang Aman Harian", pelacakan tagihan, dan tabungan bersama (Couple Savings).

---

## ✨ Fitur Utama

-   **📊 Dashboard Finansial**: Ringkasan saldo, pengeluaran bulan ini, dan skor kesehatan finansial.
-   **📅 Payday Tracking**: Simulasi sisa uang aman harian hingga tanggal gajian berikutnya.
-   **👫 Couple Savings**: Fitur khusus untuk mengelola tabungan bersama pasangan.
-   **💸 Manajemen Transaksi**: Catat pemasukan dan pengeluaran dengan kategori yang dapat disesuaikan.
-   **🎯 Saving Goals**: Target tabungan dan dana darurat dengan progres visual.
-   **🔔 Bill Reminders**: Pengingat tagihan rutin (listrik, kos, cicilan) agar tidak terlewat.
-   **🛍️ Smart Wishlist**: Simulasi dampak pembelian barang impian terhadap sisa uang aman harian.
-   **📱 PWA Ready**: Dapat diinstal di HP (Android/iOS) untuk akses cepat seperti aplikasi native.

---

## 🛠️ Tech Stack

### Backend (API)
- **Framework**: Laravel 11
- **Database**: PostgreSQL / SQLite (Local)
- **Auth**: Laravel Sanctum / Google OAuth
- **Architecture**: Service-Layer Pattern

### Frontend (UI)
- **Library**: React.js
- **Build Tool**: Vite
- **State Management**: Zustand / React Context
- **Styling**: Tailwind CSS (Mobile First)

### Deployment
- Docker & Docker Compose
- CI/CD via GitHub Actions
- Support Easypanel deployment

---

## 📂 Struktur Project

```text
WeeB/
├── weeb-api/          # Laravel Backend API
├── weeb-ui/           # React Frontend UI
├── docker/            # Konfigurasi Nginx & Docker Entrypoint
├── docker-compose.yml # Orkestrasi Multi-container
└── DEPLOY_EASYPANEL.md # Panduan Deployment Production
```

---

## 🚀 Quick Start

### 🐳 Menggunakan Docker (Rekomendasi)

1. Clone repository:
   ```bash
   git clone https://github.com/username/WeeB.git
   cd WeeB
   ```

2. Siapkan Environment:
   ```bash
   cp .env.docker.example .env
   # Edit .env dan masukkan APP_KEY (php artisan key:generate --show)
   ```

3. Jalankan Docker Compose:
   ```bash
   docker compose up -d
   ```

4. Akses Aplikasi:
   - **Frontend**: `http://localhost:8080`
   - **Backend API**: `http://localhost:8000`

---

### 💻 Pengembangan Lokal (Tanpa Docker)

#### Backend (weeb-api)
```bash
cd weeb-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

#### Frontend (weeb-ui)
```bash
cd weeb-ui
npm install
npm run dev
```

**Dibuat dengan ❤️ untuk membantu pejuang finansial.**
