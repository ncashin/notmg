FROM oven/bun:1 AS base

COPY . .

WORKDIR "/frontend"
RUN npm install & npm run build

WORKDIR "/"
RUN cp /frontend/dist /backend

WORKDIR "/backend"
RUN bun install

CMD ["bun", "index.ts"]

EXPOSE 3000