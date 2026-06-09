# ============================================
# FRONTEND - Ionic/Angular
# ============================================

# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY angular.json ./
COPY tsconfig*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build -- --configuration=production


# Etapa 2: Nginx con configuración SPA
FROM nginx:alpine

# ⚠️ BORRAR config default de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar build Angular
COPY --from=builder /app/www /usr/share/nginx/html

# 🔥 AGREGAR CONFIG SPA (ESTO TE FALTABA)
RUN echo 'server { \
  listen 80; \
  server_name _; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]