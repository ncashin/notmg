# BUILD FRONTEND
FROM node:18-alpine as frontend

WORKDIR /app

COPY ./frontend/package*.json ./

RUN npm install

COPY ./frontend/. .
 
RUN npm run build

# BUILD BACKEND

# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY ./backend/package.json ./backend/bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY ./backend/package.json ./backend/bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
# ENV NODE_ENV=production
# RUN bun test
# RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules

# fix this to pull from prelease 
COPY  ./backend/index.ts . 
COPY  ./backend/src/. ./src 
# fix this to pull from prelease 
COPY  ./backend/package.json .

COPY --from=frontend ./app/dist/. ./public/

# run the app
USER root
EXPOSE 3000
ENTRYPOINT [ "bun", "run", "index.ts" ]