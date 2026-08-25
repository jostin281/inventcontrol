# ── Etapa 1: build ────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# bcrypt tiene código nativo en C++ que se compila durante npm ci. La
# imagen "alpine" es mínima y no trae compilador; sin estas herramientas
# el build falla con "npm ci ... exit code 1" (node-gyp/gyp ERR!).
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Etapa 2: producción ──────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
# Mismo motivo que en la etapa de build: bcrypt necesita compilar acá
# también, porque esta etapa instala sus propios node_modules desde cero.
# Se instalan las herramientas como paquete "virtual" y se borran apenas
# termina npm ci, para que no queden en la imagen final que se despliega.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm ci --omit=dev \
  && apk del .build-deps

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
