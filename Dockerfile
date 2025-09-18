FROM php:8.2-cli

RUN apt-get update
RUN apt-get install -y git libzip-dev zip

RUN docker-php-ext-install zip

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /src

COPY composer.json ./


ARG GITHUB_TOKEN
RUN COMPOSER_AUTH='{"github-oauth":{"github.com":"'"${GITHUB_TOKEN}"'"}}' \
    composer install -o --prefer-dist --no-interaction
    
COPY . .
# RUN chmod a+x expose

ENV port=8080
ENV domain=localhost
ENV username=username
ENV password=password
ENV exposeConfigPath=/src/config/expose-server.php

COPY docker-entrypoint.sh /usr/bin/
RUN chmod 755 /usr/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
