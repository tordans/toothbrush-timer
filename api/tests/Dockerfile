# Local copy of the all-inkl setup: Apache + PHP 8.4, document root /srv/brush/public.
FROM php:8.4-apache

RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers deflate \
 && mkdir -p /srv/brush/config /srv/brush/api/src /srv/brush/api/migrations /srv/brush/public/api /srv/brush/logs \
 && chown www-data:www-data /srv/brush/logs

COPY apache.conf /etc/apache2/sites-available/000-default.conf
COPY docroot/ /srv/brush/public/
COPY index.html.txt /srv/brush/public/index.html
COPY entrypoint.sh /usr/local/bin/brush-entrypoint
RUN chmod +x /usr/local/bin/brush-entrypoint

ENTRYPOINT ["brush-entrypoint"]
CMD ["apache2-foreground"]
