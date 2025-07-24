FROM node:23-alpine AS deps
WORKDIR /app
COPY ./package-lock.json ./package.json ./
COPY ./frontend/package.json ./frontend/
COPY ./backend/package.json ./backend/
COPY ./core/package.json ./core/
RUN npm install

FROM node:23-alpine AS build-frontend
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ./frontend ./frontend
COPY ./core ./core
RUN cd frontend && npm run build

FROM oven/bun:1.1.13-alpine AS run-backend
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ./backend ./backend
COPY ./core ./core

COPY --from=build-frontend /app/frontend/dist ./public

CMD ["bun", "run", "backend/index.ts"]
