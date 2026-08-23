# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.19.0

# ---------- build stage ----------
FROM node:${NODE_VERSION}-slim AS builder

# bcrypt can fall back to a source build when no prebuilt binary matches
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- production deps stage ----------
FROM node:${NODE_VERSION}-slim AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# ---------- runtime stage ----------
FROM node:${NODE_VERSION}-slim AS runner

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY package.json ./
COPY templates ./templates

USER node

EXPOSE 9009

CMD ["node", "dist/index.js"]
