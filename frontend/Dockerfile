# Multi-stage image. Targets:
#   dev   Vite dev server with hot reload (docker compose default)
#   prod  static build served by nginx (docker compose --profile prod)

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM deps AS build
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
