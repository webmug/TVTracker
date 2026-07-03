#!/bin/sh
# Opstartscript voor de container (Railway draait dit als Dockerfile-CMD).
# Bewust een script i.p.v. een `a && b`-startCommand: de shell-afhandeling van
# die keten bleek op Railway onbetrouwbaar (next start startte niet na de
# migratie). Hier draaien we de stappen expliciet, met `exec` zodat next start
# procesnr. 1 wordt en signalen/logs correct doorkomen.
set -e

echo "[start] prisma migrate deploy..."
node_modules/.bin/prisma migrate deploy

echo "[start] next start op poort 3000..."
exec node_modules/.bin/next start -p 3000
