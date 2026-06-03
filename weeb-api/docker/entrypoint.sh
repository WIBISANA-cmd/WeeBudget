#!/usr/bin/env sh
set -eu

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

php artisan package:discover --ansi

if [ "${APP_ENV:-production}" = "production" ]; then
  php artisan config:cache
fi

php artisan migrate --force

if [ -n "${WEEB_ADMIN_EMAIL:-}" ] && [ -n "${WEEB_ADMIN_PASSWORD:-}" ]; then
  php artisan db:seed --class=AdminUserSeeder --force
fi

exec "$@"
