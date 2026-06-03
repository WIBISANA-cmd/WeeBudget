FROM node:22-alpine AS ui

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY weeb-ui/package.json weeb-ui/package-lock.json ./
RUN npm ci

COPY weeb-ui ./
RUN npm run build

FROM composer:2 AS vendor

WORKDIR /app

COPY weeb-api/composer.json weeb-api/composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY weeb-api ./
RUN composer dump-autoload --optimize --no-scripts

FROM php:8.4-cli-bookworm

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx \
        git \
        unzip \
        libicu-dev \
        libonig-dev \
        libpq-dev \
        libsqlite3-dev \
        libzip-dev \
    && docker-php-ext-install \
        bcmath \
        intl \
        mbstring \
        pdo_mysql \
        pdo_pgsql \
        pdo_sqlite \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=vendor /app /var/www/html
COPY --from=ui /app/dist /var/www/html/public/app
COPY docker/all-in-one-nginx.conf /etc/nginx/sites-available/default
COPY docker/all-in-one-entrypoint.sh /usr/local/bin/weeb-all-in-one

RUN chmod +x /usr/local/bin/weeb-all-in-one \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache database public/app

EXPOSE 80

ENTRYPOINT ["weeb-all-in-one"]
