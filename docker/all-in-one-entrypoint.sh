#!/usr/bin/env sh
set -eu

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache database

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
  mkdir -p "$(dirname "$DB_FILE")"
  touch "$DB_FILE"
fi

chown -R www-data:www-data storage bootstrap/cache database public/app

php artisan package:discover --ansi

if [ "${APP_ENV:-production}" = "production" ]; then
  php artisan config:cache
fi

php artisan migrate --force

php artisan serve --host=127.0.0.1 --port=8000 &

exec nginx -g "daemon off;"
