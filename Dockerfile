FROM rust:alpine AS wasm-build
RUN apk add --no-cache musl-dev curl
RUN curl -sSf https://rustwasm.github.io/wasm-pack/installer/init.sh | sh
WORKDIR /app
COPY crates/ ./crates/
RUN wasm-pack build crates/pdf-editor --target web --out-dir pkg

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
COPY --from=wasm-build /app/crates/pdf-editor/pkg ./crates/pdf-editor/pkg
RUN pnpm build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
ENV HOST=0.0.0.0
ENV PORT=80
EXPOSE 80
CMD ["node", "dist/server/entry.mjs"]
