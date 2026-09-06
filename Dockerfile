# hr-frontend — staging build.
#
# Vite env vars are baked in at BUILD time (`import.meta.env.VITE_API_BASE_URL`
# is resolved when `vite build` runs, not read at container start — the §1.3
# finding in the staging plan), so it is a build ARG here, not a runtime env
# var. A normal `deploy.sh` run always rebuilds every service, so a changed
# backend URL is picked up automatically on the next deploy.
#
# No frontend web server: the built `dist/` is copied into the shared
# `frontend-dist` named volume that Caddy (a separate compose service) mounts
# read-only and serves directly — one fewer moving part than running nginx
# here too. This container runs ONCE per `docker compose up` (restart: "no")
# to sync the volume, then exits successfully; Caddy's `depends_on` with
# `condition: service_completed_successfully` waits for that exit before
# starting.

FROM node:22-slim AS build
WORKDIR /app
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:3.20
COPY --from=build /app/dist /dist
CMD ["sh", "-c", "cp -rT /dist /out && echo 'hr-frontend: dist synced to volume'"]
