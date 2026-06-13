FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
RUN npm run -w @guild/database prisma:generate

FROM base AS api-build
RUN npm run -w @guild/api build

FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=api-build /app ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema packages/database/prisma/schema.prisma && node apps/api/dist/apps/api/src/main.js"]

FROM base AS web-build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run -w @guild/web build

FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=web-build /app ./
EXPOSE 5173
CMD ["npm", "run", "-w", "@guild/web", "start"]
