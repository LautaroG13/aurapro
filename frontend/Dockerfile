FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* se "hornea" en el bundle del cliente durante `next build`,
# no en runtime -- por eso tiene que entrar como build arg, no alcanza con
# un `environment:` en docker-compose. El valor debe ser la URL con la que
# el NAVEGADOR (no otro contenedor) llega al backend, típicamente
# http://localhost:8000 vía el puerto publicado al host.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Forma shell a propósito, mismo motivo que backend/Dockerfile: $PORT
# lo asigna Render en runtime, no se puede fijar. `--` reenvía -p al
# `next start -H 0.0.0.0` que ya define el script "start".
CMD npm run start -- -p ${PORT:-3000}
