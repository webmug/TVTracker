# Railway bouwt via deze Dockerfile i.p.v. Nixpacks. Reden: Nixpacks installeerde
# de platform-specifieke native binary van @tailwindcss/oxide (Tailwind v4) niet
# betrouwbaar, waardoor `next build` crashte met "Cannot find native binding".
# Een vaste glibc-basis + `npm ci` lost dat op.
FROM node:22-bookworm-slim AS base
WORKDIR /app

# OpenSSL is nodig voor Prisma op de slim-image.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Eerst manifest + prisma-schema: het postinstall-script draait `prisma generate`
# en heeft prisma/schema.prisma nodig vóór `npm ci`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Rest van de broncode en de productie-build.
COPY . .
RUN npm run build

EXPOSE 3000

# Op Railway wordt dit overschreven door deploy.startCommand (incl. migraties);
# lokaal / elders is dit de fallback.
CMD ["npm", "run", "start"]
